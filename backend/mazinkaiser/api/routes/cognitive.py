"""Versioned Kaiser Core cognitive endpoints (`/api/v1/...`)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from mazinkaiser.api.deps import OrchestratorDep, StateEngineDep, TacticalDep
from mazinkaiser.api.schemas import (
    ChatRequest,
    ChatResponse,
    CognitiveStatusResponse,
    CommandRequest,
    CommandResponse,
    ModeRequest,
    ParsedCommandPublic,
    PilotProfilePublic,
)
from mazinkaiser.runtime import get_memory
from mazinkaiser.services.audit.service import log_audit_event
from mazinkaiser.services.cognitive.command_parser import parse_pilot_command
from mazinkaiser.services.cognitive.intent_classification import classify_intent
from mazinkaiser.services.cognitive.response_generation import kaiser_quick_suggestion
from mazinkaiser.services.command_preprocess import normalize_pilot_utterance
from mazinkaiser.services.cognitive.turn_bridge import (
    build_instinct_status,
    execute_cognitive_chat_turn,
    mecha_compact,
)

router = APIRouter(tags=["cognitive — v1"])


@router.post("/chat", response_model=ChatResponse)
async def cognitive_chat(
    body: ChatRequest,
    orch: OrchestratorDep,
    engine: StateEngineDep,
    tactical: TacticalDep,
) -> ChatResponse:
    """Kaiser Core conversational turn with instinct + intent metadata."""
    return await execute_cognitive_chat_turn(body, orch=orch, engine=engine, tactical=tactical)


@router.post("/command", response_model=CommandResponse)
async def cognitive_command(
    body: CommandRequest,
    engine: StateEngineDep,
) -> CommandResponse:
    """Structured command parse + instinct suggestion (no mandatory LLM round-trip)."""
    sess = engine.get_or_create(body.session_id)
    mem = get_memory(sess.session_id)
    if body.mode is not None:
        sess.set_mode(body.mode)

    nt = normalize_pilot_utterance(body.raw, mem)
    parsed = parse_pilot_command(nt)
    intent = classify_intent(nt, parsed)
    mem.last_intent = intent.value

    instinct = build_instinct_status(sess, mem, sess.state.mode)
    suggestion = kaiser_quick_suggestion(instinct)

    return CommandResponse(
        session_id=sess.session_id,
        parsed=ParsedCommandPublic(
            verb=parsed.verb,
            tokens=list(parsed.tokens),
            confidence=parsed.confidence,
        ),
        intent=intent.value,
        instinct=instinct,
        kaiser_suggestion=suggestion,
    )


@router.post("/mode", response_model=CognitiveStatusResponse)
async def cognitive_set_mode(
    body: ModeRequest,
    engine: StateEngineDep,
) -> CognitiveStatusResponse:
    sess = engine.get_or_create(body.session_id)
    mem = get_memory(sess.session_id)
    prev_mode = sess.state.mode
    sess.set_mode(body.mode)
    if str(prev_mode.value) != str(sess.state.mode.value):
        mem.record_mode_transition(prev_mode.value, sess.state.mode.value)
        log_audit_event(
            "session_mode_change",
            {"surface": "/cognitive/mode", "from": prev_mode.value, "to": sess.state.mode.value},
            session_id=sess.session_id,
        )
        mem.record_telemetry_compact(mecha_compact(sess.state))
    instinct = build_instinct_status(sess, mem, sess.state.mode)
    return CognitiveStatusResponse(
        session_id=sess.session_id,
        mode=sess.state.mode,
        pilot=PilotProfilePublic(display_name=mem.pilot_display_name, callsign=mem.pilot_callsign),
        instinct=instinct,
        mecha=mecha_compact(sess.state),
    )


@router.get("/status", response_model=CognitiveStatusResponse)
async def cognitive_status(
    session_id: str | None = Query(default=None),
    *,
    engine: StateEngineDep,
) -> CognitiveStatusResponse:
    sess = engine.get_or_create(session_id)
    mem = get_memory(sess.session_id)
    sess.tick()
    instinct = build_instinct_status(sess, mem, sess.state.mode)
    return CognitiveStatusResponse(
        session_id=sess.session_id,
        mode=sess.state.mode,
        pilot=PilotProfilePublic(display_name=mem.pilot_display_name, callsign=mem.pilot_callsign),
        instinct=instinct,
        mecha=mecha_compact(sess.state),
    )
