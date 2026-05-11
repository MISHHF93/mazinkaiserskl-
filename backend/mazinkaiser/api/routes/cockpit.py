"""REST endpoints for cockpit operations."""

from __future__ import annotations

from fastapi import APIRouter, Query

from mazinkaiser.api.deps import OrchestratorDep, StateEngineDep, TacticalDep
from mazinkaiser.core.request_trace import get_trace_id
from mazinkaiser.api.schemas import (
    ChatRequest,
    ChatResponse,
    ModeRequest,
    MoveDemoRequest,
    MoveDemoResponse,
    SessionConfigResponse,
    SessionConfigUpdate,
    SessionStateResponse,
    TwinDirectiveRequest,
    TwinEventLogResponse,
)
from mazinkaiser.realtime.notify import notify_move_execution
from mazinkaiser.runtime import get_memory
from mazinkaiser.services.audit.service import log_audit_event
from mazinkaiser.services.cognitive.turn_bridge import execute_cognitive_chat_turn, mecha_compact

router = APIRouter(prefix="/cockpit", tags=["cockpit"])


@router.get("/session", response_model=SessionConfigResponse)
async def get_session_config(
    session_id: str | None = Query(default=None),
    *,
    engine: StateEngineDep,
) -> SessionConfigResponse:
    sess = engine.get_or_create(session_id)
    mem = get_memory(sess.session_id)
    return SessionConfigResponse(
        session_id=sess.session_id,
        pilot_display_name=mem.pilot_display_name,
        pilot_callsign=mem.pilot_callsign,
        wake_strip_enabled=mem.wake_strip_enabled,
        wake_prefixes=list(mem.wake_prefixes),
    )


@router.put("/session", response_model=SessionConfigResponse)
async def put_session_config(
    body: SessionConfigUpdate,
    session_id: str | None = Query(default=None),
    *,
    engine: StateEngineDep,
) -> SessionConfigResponse:
    sess = engine.get_or_create(session_id)
    mem = get_memory(sess.session_id)
    if body.pilot_display_name is not None:
        v = body.pilot_display_name.strip()
        mem.pilot_display_name = v or None
    if body.pilot_callsign is not None:
        cv = body.pilot_callsign.strip()
        mem.pilot_callsign = cv or None
    if body.wake_strip_enabled is not None:
        mem.wake_strip_enabled = body.wake_strip_enabled
    if body.wake_prefixes is not None:
        mem.wake_prefixes = list(body.wake_prefixes)
    return SessionConfigResponse(
        session_id=sess.session_id,
        pilot_display_name=mem.pilot_display_name,
        pilot_callsign=mem.pilot_callsign,
        wake_strip_enabled=mem.wake_strip_enabled,
        wake_prefixes=list(mem.wake_prefixes),
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    orch: OrchestratorDep,
    engine: StateEngineDep,
    tactical: TacticalDep,
) -> ChatResponse:
    return await execute_cognitive_chat_turn(body, orch=orch, engine=engine, tactical=tactical)


@router.get("/state", response_model=SessionStateResponse)
async def get_state(
    session_id: str | None = Query(default=None),
    *,
    engine: StateEngineDep,
) -> SessionStateResponse:
    sess = engine.get_or_create(session_id)
    sess.tick()
    return SessionStateResponse(session_id=sess.session_id, state=sess.state.model_dump_json_safe())


@router.post("/mode", response_model=SessionStateResponse)
async def set_mode(
    body: ModeRequest,
    engine: StateEngineDep,
) -> SessionStateResponse:
    sess = engine.get_or_create(body.session_id)
    mem = get_memory(sess.session_id)
    prev_mode = sess.state.mode
    sess.set_mode(body.mode)
    if str(prev_mode.value) != str(sess.state.mode.value):
        mem.record_mode_transition(prev_mode.value, sess.state.mode.value)
        log_audit_event(
            "session_mode_change",
            {"from": prev_mode.value, "to": sess.state.mode.value},
            session_id=sess.session_id,
        )
        mem.record_telemetry_compact(mecha_compact(sess.state))
    return SessionStateResponse(session_id=sess.session_id, state=sess.state.model_dump_json_safe())


@router.post("/diagnostics", response_model=SessionStateResponse)
async def diagnostics(
    session_id: str | None = Query(default=None),
    *,
    engine: StateEngineDep,
) -> SessionStateResponse:
    sess = engine.get_or_create(session_id)
    mem = get_memory(sess.session_id)
    sess.run_diagnostics()
    mem.record_telemetry_compact(mecha_compact(sess.state))
    log_audit_event(
        "diagnostic_run",
        {"tactical_alert": sess.state.tactical_alert, "movement_ready": sess.state.movement_ready},
        session_id=sess.session_id,
    )
    return SessionStateResponse(session_id=sess.session_id, state=sess.state.model_dump_json_safe())


@router.post("/move-demo", response_model=MoveDemoResponse)
async def move_demo(body: MoveDemoRequest, engine: StateEngineDep) -> MoveDemoResponse:
    sess = engine.get_or_create(body.session_id)
    mem = get_memory(sess.session_id)
    sess.trigger_move_demo(
        body.move,
        pilot_authorized=body.pilot_authorized,
        strict_safety=body.strict_safety,
    )
    batch = sess.last_move_batch or {}
    outcome = batch.get("outcome", "unknown")
    vid = batch.get("move_id", getattr(body.move, "value", "unknown"))
    mem.record_move(
        move_id=str(vid),
        outcome=str(outcome),
        voice_line=str(batch.get("voice_line") or ""),
        trace_id=get_trace_id(),
    )
    mem.record_telemetry_compact(mecha_compact(sess.state))
    log_audit_event(
        "move_execution",
        {
            "move_id": str(vid),
            "outcome": str(outcome),
            "pilot_authorized": body.pilot_authorized,
            "strict_safety": body.strict_safety,
            "voice_line_chars": len(str(batch.get("voice_line") or "")),
        },
        session_id=sess.session_id,
    )
    await notify_move_execution(
        sess.session_id,
        batch,
        trace_id=get_trace_id(),
        telemetry=sess.state.model_dump_json_safe(),
    )
    return MoveDemoResponse(
        session_id=sess.session_id,
        state=sess.state.model_dump_json_safe(),
        move_batch=batch,
    )


@router.get("/twin/events", response_model=TwinEventLogResponse)
async def twin_event_log(
    session_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    *,
    engine: StateEngineDep,
) -> TwinEventLogResponse:
    sess = engine.get_or_create(session_id)
    return TwinEventLogResponse(session_id=sess.session_id, events=sess.twin_events(limit))


@router.post("/twin/directive", response_model=SessionStateResponse)
async def twin_directive(
    body: TwinDirectiveRequest,
    engine: StateEngineDep,
) -> SessionStateResponse:
    """Execute a simulation directive (tool / AI adjunct hook)."""
    sess = engine.get_or_create(body.session_id)
    sess.apply_directive(body.directive)
    return SessionStateResponse(session_id=sess.session_id, state=sess.state.model_dump_json_safe())


@router.get("/tactical")
async def tactical_snapshot(tactical: TacticalDep) -> dict:
    snap = tactical.snapshot()
    return {
        "threats_ranked": snap.threats_ranked,
        "recommended_defense": snap.recommended_defense,
        "environment": snap.environment,
        "prediction": snap.prediction,
    }
