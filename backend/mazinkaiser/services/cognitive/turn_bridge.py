"""HTTP-facing cognitive chat execution (FastAPI routers delegate here)."""

from __future__ import annotations

from mazinkaiser.api.schemas import ChatRequest, ChatResponse
from mazinkaiser.domain.mecha_state import MechaState
from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.runtime import get_memory
from mazinkaiser.services.ai.orchestrator import AIOrchestrator
from mazinkaiser.services.cognitive.intent import PilotIntent
from mazinkaiser.services.cognitive.pipeline import build_cognitive_turn_bundle
from mazinkaiser.services.cognitive.response_generation import amplify_reply_tone_hint
from mazinkaiser.services.command_preprocess import normalize_pilot_utterance
from mazinkaiser.services.memory.session import SessionMemory
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
    bundle = build_cognitive_turn_bundle(
        sess=sess,
        memory=mem,
        mode=mode,
        normalized_text=nt,
        tactical_svc=tactical,
    )

    reply, meta = await orch.run_turn(
        user_text=body.text,
        mode=sess.state.mode,
        memory=mem,
        cognitive_addon=bundle.system_prompt_addon(),
        session_id=sess.session_id,
    )

    if meta.get("provider") in ("local_stub", "fallback_stub"):
        reply = amplify_reply_tone_hint(reply, bundle.instinct)

    return ChatResponse(
        session_id=sess.session_id,
        reply=reply,
        safety=str(meta.get("safety", "allow")),
        mode=sess.state.mode,
        intent=bundle.intent.value,
        instinct=bundle.instinct,
        session_context=bundle.session_context if body.include_session_context else None,
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
