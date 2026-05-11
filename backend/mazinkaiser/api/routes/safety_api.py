"""Public safety stance + policy synopsis (education / integration aid)."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter

from mazinkaiser.api.schemas import SafetyPoliciesEnvelope, SafetyPolicyDocument

router = APIRouter(prefix="/safety", tags=["safety"])


@router.get("/policies", response_model=SafetyPoliciesEnvelope)
async def get_safety_policies() -> SafetyPoliciesEnvelope:
    doc = SafetyPolicyDocument(
        version="2026.05-majuro",
        stance=[
            "Refuse facilitation of violence, illicit cyber activity, unsafe robotics interference, "
            "or kinetic operations framed as real-world execution.",
            "Keep Mazinkaiser combat narratives inside the declared simulation/digital-twin framing.",
            "Surface clear, auditable refusals — never mimic secretive harmful assistance.",
            "Bias toward conservative interpretation when ambiguity spans physical harm.",
        ],
        simulation_only={
            "principle": "Move batches and narration are cinematic training artifacts.",
            "enforcement": "Safety governor evaluates both raw transcripts and sanitized pilot text.",
            "move_pipeline": (
                "Move execution binds to digital twin kernels; pilot authorization gates remain explicit."
            ),
        },
        robotics={
            "coverage": (
                "Disables bypass of interlocks/emergency-stop language; refuses armed autonomous attack requests."
            ),
            "guidance": "Operational robotics must follow OEM safety manuals and lawful supervision.",
        },
        privacy={
            "session_boundary": (
                "Session memory is process-local MVP data; purge by rotating session ids or restarting workers."
            ),
            "preferences": (
                "Preference maps are capped; callers must avoid storing regulated PII blobs without DPIA/consent flows."
            ),
            "telemetry_history": (
                "Compact telemetry excerpts exclude raw biometric feeds — only synthesized HUD aggregates."
            ),
        },
        escalation={
            "behavior": (
                "'Escalate' decisions mirror sensitive actions that should route through explicit cockpit auth UX."
            ),
            "hint": "Expose acknowledgements separately from conversational LLM completions.",
        },
    )
    return SafetyPoliciesEnvelope(
        generated_at=datetime.now(UTC).isoformat(),
        policies=doc,
    )
