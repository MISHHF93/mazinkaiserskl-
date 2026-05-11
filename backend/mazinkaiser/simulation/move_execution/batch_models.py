"""Batch-step reporting for cinematic move pipelines."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class BatchStepKind(StrEnum):
    """Ordered execution phases (indexes the 14-phase lock specification)."""

    AUTHORIZATION_CHECK = "authorization_check"
    SAFETY_GOVERNOR = "safety_governor"
    TELEMETRY_SNAPSHOT = "telemetry_snapshot"
    ENERGY_GATE = "energy_gate"
    HEAT_COOLDOWN_GATE = "heat_cooldown_gate"
    TACTICAL_INTENT_CONFIRM = "tactical_intent_confirm"
    CINEMATIC_PREP = "cinematic_prep"
    HUD_AVATAR_CUE = "hud_avatar_cue"
    EXECUTION_SIM = "execution_sim"
    TELEMETRY_MUTATION = "telemetry_mutation"
    COOLDOWN_REGISTER = "cooldown_register"
    VOICE_RESPONSE = "voice_response"
    OPERATIONS_LOG = "operations_log"
    POST_ACTION_ANALYSIS = "post_action_analysis"


class MoveBatchOutcome(StrEnum):
    ACCEPTED = "accepted"
    REFUSED = "refused"


@dataclass
class BatchStepReport:
    step: BatchStepKind
    ok: bool
    summary: str
    data: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "step": self.step.value,
            "ok": self.ok,
            "summary": self.summary,
            "data": self.data,
        }


@dataclass
class MoveBatchReport:
    outcome: MoveBatchOutcome
    move_id: str
    voice_line: str
    animation_plan: list[dict[str, Any]]
    steps: list[BatchStepReport] = field(default_factory=list)
    post_analysis: dict[str, Any] = field(default_factory=dict)
    adapter_hook: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "outcome": self.outcome.value,
            "move_id": self.move_id,
            "voice_line": self.voice_line,
            "animation_plan": self.animation_plan,
            "steps": [s.to_dict() for s in self.steps],
            "post_analysis": self.post_analysis,
            "adapter_hook": self.adapter_hook,
        }
