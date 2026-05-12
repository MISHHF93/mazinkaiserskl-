"""WebSocket cockpit stream — telemetry, avatar projection, move events, assistant streaming."""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from mazinkaiser.api.schemas import ChatRequest
from mazinkaiser.domain.cinematic_scale import cinematic_scale_public_dict
from mazinkaiser.core.config import get_settings
from mazinkaiser.core.request_trace import reset_trace_id, set_trace_id
from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.observability.metrics import (
    WS_ACTIVE_CONNECTIONS,
    WS_CONNECTIONS_TOTAL,
    WS_MESSAGES_IN_TOTAL,
    WS_MESSAGES_OUT_TOTAL,
)
from mazinkaiser.realtime.hub import get_realtime_hub
from mazinkaiser.runtime import engine as shared_engine
from mazinkaiser.runtime import get_memory
from mazinkaiser.runtime import tactical as shared_tactical
from mazinkaiser.services.ai.orchestrator import AIOrchestrator
from mazinkaiser.services.cognitive.turn_bridge import execute_cognitive_chat_turn

log = structlog.get_logger(__name__)
router = APIRouter()


async def _send(ws: WebSocket, msg: dict[str, Any]) -> None:
    await ws.send_text(json.dumps(msg, ensure_ascii=False))
    WS_MESSAGES_OUT_TOTAL.inc()


@router.websocket("/ws/cockpit")
async def cockpit_ws(websocket: WebSocket) -> None:
    await websocket.accept()
    WS_CONNECTIONS_TOTAL.inc()
    WS_ACTIVE_CONNECTIONS.inc(1.0)

    hub = get_realtime_hub()
    settings = get_settings()
    orch = AIOrchestrator(settings)
    engine = shared_engine

    q_session = websocket.query_params.get("session_id")
    topics_raw = websocket.query_params.get("topics")
    topics = hub.parse_topics_query(topics_raw)
    sess = engine.get_or_create(q_session)
    session_id = sess.session_id

    sub_q, bound = await hub.attach(session_id, topics=topics)
    stop = asyncio.Event()
    conn_id = str(uuid.uuid4())

    async def forward_loop() -> None:
        while not stop.is_set():
            msg = await sub_q.get()
            await _send(websocket, msg)

    forward_task = asyncio.create_task(forward_loop())

    try:
        mem = get_memory(session_id)
        await _send(
            websocket,
            {
                "type": "welcome",
                "protocol_version": 1,
                "connection_id": conn_id,
                "session_id": session_id,
                "topics": sorted(topics),
                "ts": datetime.now(UTC).isoformat(),
                "cinematic_scale_profile": cinematic_scale_public_dict(),
                "resume": {
                    "hint": "Reconnect with the same ?session_id= to continue the twin session.",
                },
            },
        )
        snap = engine.get_or_create(session_id).telemetry_read(advance_tick=False)
        tele = snap.model_dump_json_safe()
        bootstrap = {
            "type": "telemetry",
            "seq": 0,
            "bootstrap": True,
            "ts": datetime.now(UTC).isoformat(),
            "session_id": session_id,
            "telemetry": tele,
            "state": tele,
        }
        await _send(websocket, bootstrap)
        await _send(
            websocket,
            {
                "type": "avatar_state",
                "seq": 0,
                "bootstrap": True,
                "ts": datetime.now(UTC).isoformat(),
                "session_id": session_id,
                "avatar": {
                    "avatar_configured": True,
                    "pilot_display_name_set": bool(mem.pilot_display_name),
                    "pilot_callsign_set": bool(mem.pilot_callsign),
                    "mode": str(snap.mode),
                    "wake_strip_enabled": mem.wake_strip_enabled,
                },
            },
        )
        await _send(
            websocket,
            {
                "type": "session",
                "session_id": session_id,
                "state": tele,
            },
        )

        while True:
            raw = await websocket.receive_text()
            WS_MESSAGES_IN_TOTAL.inc()
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                await _send(websocket, {"type": "error", "message": "invalid_json"})
                continue

            msg_type = payload.get("type")
            if msg_type == "hello":
                tlist = payload.get("topics")
                if isinstance(tlist, list):
                    new_topics = hub.parse_topics_query(",".join(str(x) for x in tlist))
                    await hub.rebind_topics(session_id, bound, new_topics)
                    topics_snapshot = new_topics
                else:
                    topics_snapshot = bound.topics
                await _send(
                    websocket,
                    {
                        "type": "welcome",
                        "protocol_version": 1,
                        "session_id": session_id,
                        "topics": sorted(topics_snapshot),
                        "rebound": True,
                    },
                )
                continue

            if msg_type == "ping":
                await _send(
                    websocket,
                    {"type": "pong", "ts": datetime.now(UTC).isoformat()},
                )
                continue

            if msg_type == "chat":
                text = str(payload.get("text", "")).strip()
                if not text:
                    await _send(websocket, {"type": "error", "message": "empty_text"})
                    continue
                mode_str = payload.get("mode")
                cur = engine.get_or_create(session_id)
                mode = PersonalityMode(str(mode_str)) if mode_str else cur.state.mode
                if mode_str:
                    cur.set_mode(mode)

                tid = str(
                    payload.get("trace_id") or websocket.headers.get("x-request-id") or uuid.uuid4()
                )
                tok = set_trace_id(tid)
                try:
                    resp = await execute_cognitive_chat_turn(
                        ChatRequest(
                            session_id=session_id,
                            text=text,
                            mode=None,
                            include_session_context=False,
                        ),
                        orch=orch,
                        engine=engine,
                        tactical=shared_tactical,
                    )
                finally:
                    reset_trace_id(tok)

                await _send(
                    websocket,
                    {
                        "type": "assistant",
                        "trace_id": tid,
                        "text": resp.reply,
                        "safety": resp.safety,
                        "mode": str(engine.get_or_create(session_id).state.mode),
                        "intent": resp.intent,
                        "instinct": resp.instinct.model_dump(mode="json") if resp.instinct else None,
                        "move_batch": resp.move_batch,
                    },
                )
                reply = resp.reply
                for i in range(0, len(reply), 48):
                    await _send(
                        websocket,
                        {
                            "type": "assistant_token",
                            "trace_id": tid,
                            "token": reply[i : i + 48],
                        },
                    )
                    await asyncio.sleep(0.02)
                await _send(
                    websocket,
                    {"type": "assistant_done", "trace_id": tid},
                )

            else:
                await _send(websocket, {"type": "error", "message": "unknown_type"})

    except WebSocketDisconnect:
        log.info("ws_disconnect", session_id=session_id, connection_id=conn_id)
    finally:
        stop.set()
        forward_task.cancel()
        try:
            await forward_task
        except asyncio.CancelledError:
            pass
        await hub.detach(session_id, bound)
        WS_ACTIVE_CONNECTIONS.dec(1.0)
