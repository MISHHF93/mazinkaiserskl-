"""HTTP-facing cognitive chat execution (FastAPI routers delegate here)."""

from __future__ import annotations

from mazinkaiser.api.schemas import ChatRequest, ChatResponse
from mazinkaiser.core.config import get_settings
from mazinkaiser.core.request_trace import get_trace_id
from mazinkaiser.domain.mecha_state import MechaState
from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.realtime.notify import notify_move_execution
from mazinkaiser.runtime import get_memory
from mazinkaiser.services.ai.orchestrator import AIOrchestrator
from mazinkaiser.services.audit.service import log_audit_event
from mazinkaiser.services.cognitive.session_context import build_session_context_dict
from mazinkaiser.services.cognitive.intent import PilotIntent
from mazinkaiser.services.cognitive.command_parser import parse_pilot_command
from mazinkaiser.services.cognitive.intent_classification import classify_intent
from mazinkaiser.services.cognitive.intent_merge import merged_intent_for_operations
from mazinkaiser.services.cognitive.move_resolve import pilot_authorized_for_resolved_move, resolve_kaiser_move_from_pilot_input
from mazinkaiser.services.cognitive.pipeline import build_cognitive_turn_bundle, build_pre_model_cognitive_addon
from mazinkaiser.services.cognitive.response_generation import amplify_reply_tone_hint
from mazinkaiser.services.command_preprocess import normalize_pilot_utterance
from mazinkaiser.services.memory.session import SessionMemory
from mazinkaiser.services.safety_governor import SafetyDecision
from mazinkaiser.services.state_engine import CockpitSession, StateEngine
from mazinkaiser.services.tactical.simulation import TacticalSimulationService
from mazinkaiser.simulation.instinct.engine import KaiserInstinctEngine
from mazinkaiser.simulation.instinct.models import InstinctAssessment


async def execute_cognitive_chat_turn(
    body: ChatRequest,
    *,
    orch: AIOrchestrator,
    engine: StateEngine,
    tactical: TacticalSimulationService,
) -> ChatResponse:
    sess = engine.get_or_create(body.session_id)
    mem = get_memory(sess.session_id)

    mode: PersonalityMode = body.mode or sess.state.mode
    if body.mode is not None:
        sess.set_mode(body.mode)

    nt = normalize_pilot_utterance(body.text, mem)
    parsed_cmd = parse_pilot_command(nt)
    heuristic_intent = classify_intent(nt, parsed_cmd)

    settings = get_settings()
    unified = settings.unified_structured_turn_enabled() and bool(settings.openai_api_key)

    sess_ctx_pub: dict
    if unified:
        cognitive_addon = build_pre_model_cognitive_addon(
            sess=sess,
            memory=mem,
            mode=mode,
            tactical_svc=tactical,
        )
        sess_ctx_pub = build_session_context_dict(sess, mem, mode=mode)
    else:
        bundle = build_cognitive_turn_bundle(
            sess=sess,
            memory=mem,
            mode=mode,
            normalized_text=nt,
            tactical_svc=tactical,
        )
        cognitive_addon = bundle.system_prompt_addon()
        sess_ctx_pub = bundle.session_context

    reply, meta = await orch.run_turn(
        user_text=body.text,
        mode=sess.state.mode,
        memory=mem,
        cognitive_addon=cognitive_addon,
        session_id=sess.session_id,
        unified_structured=unified,
    )

    sint_field = meta.get("pilot_intent_raw") if meta.get("structured_unified") else None
    sint_s = sint_field if isinstance(sint_field, str) else None
    effective_intent = merged_intent_for_operations(
        structured_intent_raw=sint_s,
        heuristic_intent=heuristic_intent,
        parsed=parsed_cmd,
    )
    instinct = KaiserInstinctEngine().evaluate(
        snapshot=sess.twin_snapshot,
        mode=sess.state.mode,
        intent=effective_intent,
        user_text=nt,
    )
    mem.last_intent = effective_intent.value

    if meta.get("provider") in ("local_stub", "fallback_stub"):
        reply = amplify_reply_tone_hint(reply, instinct)

    move_batch: dict | None = None
    llm_providers = {"openai_compatible", "local_stub", "fallback_stub"}
    if (
        effective_intent == PilotIntent.MOVE_REQUEST
        and meta.get("provider") in llm_providers
        and meta.get("safety") == SafetyDecision.ALLOW
    ):
        km = resolve_kaiser_move_from_pilot_input(nt, parsed_cmd)
        pilot_auth = pilot_authorized_for_resolved_move(parsed_cmd)
        if km is not None and pilot_auth:
            sess.trigger_move_demo(km, pilot_authorized=pilot_auth, strict_safety=True)
            batch = sess.last_move_batch or {}
            outcome = batch.get("outcome", "unknown")
            vid = batch.get("move_id", km.value)
            tid_mv = get_trace_id()
            mem.record_move(
                move_id=str(vid),
                outcome=str(outcome),
                voice_line=str(batch.get("voice_line") or ""),
                trace_id=tid_mv,
            )
            mem.record_telemetry_compact(mecha_compact(sess.state))
            log_audit_event(
                "move_execution",
                {
                    "move_id": str(vid),
                    "outcome": str(outcome),
                    "source": "cognitive_chat",
                    "pilot_authorized": pilot_auth,
                    "strict_safety": True,
                    "voice_line_chars": len(str(batch.get("voice_line") or "")),
                },
                session_id=sess.session_id,
            )
            await notify_move_execution(
                sess.session_id,
                batch,
                trace_id=tid_mv,
                telemetry=sess.state.model_dump_json_safe(),
            )
            move_batch = batch

    return ChatResponse(
        session_id=sess.session_id,
        reply=reply,
        safety=str(meta.get("safety", "allow")),
        mode=sess.state.mode,
        intent=effective_intent.value,
        instinct=instinct,
        session_context=sess_ctx_pub if body.include_session_context else None,
        move_batch=move_batch,
    )


def resolve_stored_intent(memory: SessionMemory) -> PilotIntent:
    if not memory.last_intent:
        return PilotIntent.UNKNOWN
    try:
        return PilotIntent(memory.last_intent)
    except ValueError:
        return PilotIntent.UNKNOWN


def build_instinct_status(
    sess: CockpitSession,
    memory: SessionMemory,
    mode: PersonalityMode,
) -> InstinctAssessment:
    intent = resolve_stored_intent(memory)
    return KaiserInstinctEngine().evaluate(
        snapshot=sess.twin_snapshot,
        mode=mode,
        intent=intent,
        user_text="",
    )


def mecha_compact(state: MechaState) -> dict[str, object]:
    return {
        "photon_power_pct": state.photon_power_pct,
        "heat_level_pct": state.heat_level_pct,
        "sync_rate_pct": state.sync_rate_pct,
        "tactical_alert": state.tactical_alert,
        "movement_ready": state.movement_ready,
        "structural_stress_pct": state.structural_stress_pct,
        "operational_state": state.operational_state.value,
        "scrander_status": state.scrander_status.value,
        "pilder_docking_status": state.pilder_docking_status.value,
        "movement_state": state.movement_state.value,
        "nova_readiness_pct": state.nova_readiness_pct,
        "overdrive_risk_pct": state.overdrive_risk_pct,
        "pilot_sync_pct": state.pilot_sync_pct,
        "pilot_stress_pct": state.pilot_stress_pct,
        "pilot_recognition_status": state.pilot_recognition_status.value,
        "alerts_count": len(state.alerts_active),
    }
