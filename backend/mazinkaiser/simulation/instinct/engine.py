"""Kaiser Instinct Engine — predictive overlays on the digital twin (deterministic)."""

from __future__ import annotations

from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.domain.twin_state import TwinOperationalState
from mazinkaiser.services.cognitive.intent import PilotIntent
from mazinkaiser.simulation.instinct.models import InstinctAssessment
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot


class KaiserInstinctEngine:
    """Maps twin telemetry + intent into urgency, tone, and actionable recommendations."""

    def evaluate(
        self,
        *,
        snapshot: TwinSnapshot,
        mode: PersonalityMode,
        intent: PilotIntent,
        user_text: str,
    ) -> InstinctAssessment:
        _ = user_text  # reserved for future contextual models
        predicted = _intent_label(intent)
        flags = _danger_flags(snapshot, mode)
        urgency = _urgency(flags, snapshot, mode)
        actions = _recommendations(flags, snapshot, intent, urgency)
        tone = _tone(mode, urgency)
        tactical = _one_line_tactical(snapshot, intent)

        return InstinctAssessment(
            predicted_intent=predicted,
            urgency=urgency,
            danger_flags=flags,
            recommended_actions=actions,
            tone_directive=tone,
            tactical_reasoning_summary=tactical,
        )


def _intent_label(intent: PilotIntent) -> str:
    return {
        PilotIntent.GENERAL_DIALOGUE: "General dialogue / rapport",
        PilotIntent.DIAGNOSTICS: "Systems diagnostics or health check",
        PilotIntent.MOVE_REQUEST: "Weapons or move execution (simulated)",
        PilotIntent.DIRECTIVE_REQUEST: "Simulation directive",
        PilotIntent.MODE_CHANGE: "Operational mode change",
        PilotIntent.TACTICAL_INQUIRY: "Tactical picture or threat discussion",
        PilotIntent.STATUS_CHECK: "Telemetry or readiness status",
        PilotIntent.SAFETY_OR_REFUSAL_CONTEXT: "Safety, policy, or refusal follow-up",
        PilotIntent.UNKNOWN: "Intent unclear — continue with clarifying questions",
    }[intent]


def _danger_flags(snapshot: TwinSnapshot, mode: PersonalityMode) -> list[str]:
    out: list[str] = []
    if snapshot.heat_pct >= 82:
        out.append("THERMAL_HIGH")
    elif snapshot.heat_pct >= 72:
        out.append("THERMAL_ELEVATED")

    if snapshot.sync_rate_pct <= 48:
        out.append("SYNCHRO_CRITICAL")
    elif snapshot.sync_rate_pct <= 62:
        out.append("SYNCHRO_UNSTABLE")

    if snapshot.synchro_bandwidth_pct <= 55:
        out.append("CHANNEL_CONGESTION")

    if snapshot.structural_stress_pct >= 72:
        out.append("STRUCTURAL_STRESS")

    if snapshot.reactor_output_pct >= 92 and snapshot.photon_reserve_pct <= 58:
        out.append("POWER_BUDGET_TENSION")

    if mode == PersonalityMode.OVERDRIVE_WARNING_MODE:
        out.append("OVERDRIVE_VOICE_ACTIVE")

    if snapshot.overdrive_risk_pct >= 78:
        out.append("OVERDRIVE_PROXIMITY")

    if snapshot.nova_readiness_pct >= 82:
        out.append("NOVA_LANE_HOT")

    if snapshot.operational_state == TwinOperationalState.CRITICAL_CORE:
        out.append("OPERATIONAL_CRITICAL_CORE")

    if snapshot.operational_state == TwinOperationalState.NOVA_PREP:
        out.append("NOVA_PREP_ARMED")

    if snapshot.operational_state == TwinOperationalState.SHUTDOWN_SAFE:
        out.append("SHUTDOWN_SAFE_ENVELOPE")

    tb = (snapshot.tactical_band or "").upper()
    if tb not in ("CLEAR", "", "NOMINAL"):
        out.append(f"TACTICAL_BAND:{tb}")

    return out


def _urgency(flags: list[str], snapshot: TwinSnapshot, mode: PersonalityMode) -> str:
    critical_markers = (
        "SYNCHRO_CRITICAL",
        "THERMAL_HIGH",
        "STRUCTURAL_STRESS",
        "OPERATIONAL_CRITICAL_CORE",
    )
    if any(m in flags for m in critical_markers):
        return "critical"
    if snapshot.heat_pct >= 88 or snapshot.sync_rate_pct <= 45:
        return "critical"
    if any(x in flags for x in ("SYNCHRO_UNSTABLE", "THERMAL_ELEVATED", "CHANNEL_CONGESTION")):
        return "high"
    if mode == PersonalityMode.OVERDRIVE_WARNING_MODE or snapshot.heat_pct >= 68:
        return "elevated"
    if flags:
        return "elevated"
    return "nominal"


def _recommendations(
    flags: list[str],
    snapshot: TwinSnapshot,
    intent: PilotIntent,
    urgency: str,
) -> list[str]:
    acts: list[str] = []
    if "THERMAL_HIGH" in flags or urgency == "critical" and snapshot.heat_pct >= 80:
        acts.append(
            "Simulated thermal relief: reduce photon-heavy sequences; consider THERMAL_EMERGENCY_FLUSH directive."
        )
    elif "THERMAL_ELEVATED" in flags:
        acts.append(
            "Monitor heat sink cycle; avoid chaining high-heat moves until bars normalize.",
        )

    if "SYNCHRO_UNSTABLE" in flags or "SYNCHRO_CRITICAL" in flags:
        acts.append("Run SYNC_RECALIBRATED and hold aggressive maneuvers until sync rate recovers.")

    if "CHANNEL_CONGESTION" in flags:
        acts.append("Defer non-critical bus traffic; prioritize command channel for pilot sync.")

    if "STRUCTURAL_STRESS" in flags:
        acts.append("Structural load high — favor defensive posture and avoid repeated impact demos.")

    if "POWER_BUDGET_TENSION" in flags:
        acts.append(
            "Balance reactor draw with photon reserves before Nova-class sequences (simulation-only).",
        )

    if intent == PilotIntent.MOVE_REQUEST and urgency in ("high", "critical"):
        acts.append("Delay discretionary weapons play; confirm containment and pilot stress first.")

    if not acts:
        acts.append("Maintain patrol posture; telemetry within acceptable training band.")

    return acts[:5]


def _tone(mode: PersonalityMode, urgency: str) -> str:
    if mode == PersonalityMode.OVERDRIVE_WARNING_MODE:
        return "alert_compact"
    if urgency == "critical":
        return "alert"
    if urgency == "high":
        return "heightened_caution"
    if urgency == "elevated":
        return "steady_watch"
    return "steady"


def _one_line_tactical(snapshot: TwinSnapshot, intent: PilotIntent) -> str:
    band = snapshot.tactical_band or "CLEAR"
    move = snapshot.last_move_name or "none"
    focus = "readiness" if intent == PilotIntent.STATUS_CHECK else "combat training (simulated)"
    return (
        f"Band {band}; last simulated move «{move}»; posture {snapshot.operational_state.value}; "
        f"evaluating for {focus}. All effects are fictional training data."
    )
