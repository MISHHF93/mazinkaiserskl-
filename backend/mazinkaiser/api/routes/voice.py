"""Voice interaction HTTP layer — STT/TTS provider shell + streaming (simulation)."""

from __future__ import annotations

import json
from typing import Any, AsyncIterator

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from mazinkaiser.api.deps import OrchestratorDep, StateEngineDep, TacticalDep
from mazinkaiser.api.schemas import ChatRequest, VoiceIngestRequest, VoiceIngestResponse, VoiceParsedCommand, VoiceStreamRequest
from mazinkaiser.core.config import get_settings
from mazinkaiser.runtime import get_memory
from mazinkaiser.services.audit.service import log_audit_event
from mazinkaiser.services.cognitive.turn_bridge import execute_cognitive_chat_turn
from mazinkaiser.services.voice.router import VoiceInteractionRouter
from mazinkaiser.services.voice.tts_providers import BrowserClientTTSHints, SimulatedReplyStreamer

router = APIRouter(prefix="/voice", tags=["voice"])


def _hints_for_tts() -> BrowserClientTTSHints:
    return BrowserClientTTSHints()


@router.post("/ingest", response_model=VoiceIngestResponse)
async def voice_ingest(
    body: VoiceIngestRequest,
    engine: StateEngineDep,
    orch: OrchestratorDep,
    tactical: TacticalDep,
) -> VoiceIngestResponse:
    """Validate voice transcript, normalize wake phrases, parse heuristic command shape."""
    settings = get_settings()
    voice_router = VoiceInteractionRouter(stt_provider_id=settings.voice_stt_provider)
    sess = engine.get_or_create(body.session_id)
    mem = get_memory(sess.session_id)
    if body.mode is not None:
        sess.set_mode(body.mode)
    try:
        ing = await voice_router.route_stt_final(
            transcript=body.transcript,
            memory=mem,
            locale=body.locale,
            source=body.source,
        )
    except NotImplementedError as e:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(e),
        ) from e
    parsed = ing.parsed
    log_audit_event(
        "voice_ingest",
        {
            "intent": ing.intent,
            "verb": parsed.verb,
            "raw_len": len(ing.raw_transcript),
            "normalized_len": len(ing.normalized_for_model or ""),
            "source": body.source,
            "execute_turn": body.execute_turn,
        },
        session_id=sess.session_id,
    )
    tts = _hints_for_tts()
    hints: dict[str, Any] = dict(tts.build_client_hints(ing.normalized_for_model or ing.raw_transcript))
    hints["voice_tts_provider"] = settings.voice_tts_provider
    chat_resp = None
    if body.execute_turn:
        chat_resp = await execute_cognitive_chat_turn(
            ChatRequest(
                session_id=sess.session_id,
                text=ing.raw_transcript,
                mode=sess.state.mode,
                include_session_context=body.include_session_context,
            ),
            orch=orch,
            engine=engine,
            tactical=tactical,
        )
    return VoiceIngestResponse(
        session_id=sess.session_id,
        raw_transcript=ing.raw_transcript,
        normalized_text=ing.normalized_for_model,
        stt_provider=ing.stt_provider,
        intent=ing.intent,
        parsed=VoiceParsedCommand(
            verb=parsed.verb,
            tokens=list(parsed.tokens),
            confidence=parsed.confidence,
        ),
        tts_hints=hints,
        wake_routing=ing.wake_routing,
        chat=chat_resp,
    )


async def _sse_reply_chunks(full: str) -> AsyncIterator[bytes]:
    streamer = SimulatedReplyStreamer()
    async for piece in streamer.emit_reply_chunks(full, chunk_size=48):
        payload = json.dumps({"type": "token", "text": piece}, ensure_ascii=False)
        yield f"data: {payload}\n\n".encode()


@router.post("/stream")
async def voice_stream_sse(
    body: VoiceStreamRequest,
    orch: OrchestratorDep,
    engine: StateEngineDep,
    tactical: TacticalDep,
) -> StreamingResponse:
    """
    Server-Sent Events simulated stream of Kaiser reply (chunks).
    Future: bind to OpenAI-compatible `stream=True` when available.
    """
    sess = engine.get_or_create(body.session_id)
    if body.mode is not None:
        sess.set_mode(body.mode)
    resp = await execute_cognitive_chat_turn(
        ChatRequest(
            session_id=sess.session_id,
            text=body.text,
            mode=None,
            include_session_context=body.include_session_context,
        ),
        orch=orch,
        engine=engine,
        tactical=tactical,
    )

    async def gen() -> AsyncIterator[bytes]:
        head = json.dumps(
            {
                "type": "meta",
                "session_id": resp.session_id,
                "mode": str(resp.mode.value),
                "intent": resp.intent,
                "safety": resp.safety,
            },
            ensure_ascii=False,
        )
        yield f"data: {head}\n\n".encode()
        async for chunk in _sse_reply_chunks(resp.reply):
            yield chunk
        tail = json.dumps(
            {
                "type": "done",
                "reply": resp.reply,
                "instinct": resp.instinct.model_dump(mode="json") if resp.instinct else None,
            },
            ensure_ascii=False,
        )
        yield f"data: {tail}\n\n".encode()

    return StreamingResponse(gen(), media_type="text/event-stream")
