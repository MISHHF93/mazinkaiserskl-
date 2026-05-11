"""Tactical adjunct: move suggestions from twin telemetry + pilot sync context."""

from __future__ import annotations

from typing import Any

from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.domain.moves import KaiserMove, kaiser_move_slug
from mazinkaiser.domain.pilot_sync import PilotRecognitionState, pilot_meets_sync_tier
from mazinkaiser.domain.twin_state import PilderDockingTelemetryStatus, TwinOperationalState
from mazinkaiser.simulation.move_execution.registry import get_move_definition, iterate_move_definitions
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot


def _gates_ok(snapshot: TwinSnapshot, move: KaiserMove) -> bool:
    if snapshot.operational_state == TwinOperationalState.SHUTDOWN_SAFE:
        return False
    if snapshot.pilder_docking_status != PilderDockingTelemetryStatus.DOCKED:
        return False
    if snapshot.pilot_recognition_status != PilotRecognitionState.VERIFIED:
        return False
    dfn = get_move_definition(move)
    g = dfn.gates
    if snapshot.photon_reserve_pct + 1e-6 < g.min_photon_pct:
        return False
    if snapshot.heat_pct > g.max_allowed_heat_pct + 1e-6:
        return False
    if snapshot.armor_integrity_pct + 1e-6 < g.min_armor_pct:
        return False
    if snapshot.sync_rate_pct + 1e-6 < g.min_sync_pct:
        return False
    if snapshot.energy_reserve_pct + 1e-6 < g.min_energy_pct:
        return False
    if snapshot.synchro_bandwidth_pct + 1e-6 < g.min_synchro_bandwidth_pct:
        return False
    if g.require_movement_ready and not snapshot.movement_ready:
        return False
    if g.disallow_if_cooldown_active and snapshot.cooldowns_remaining.get(move.value, 0.0) > 0.15:
        return False
    return pilot_meets_sync_tier(snapshot.pilot_sync_pct, dfn.required_pilot_sync_tier)


def ranked_move_recommendations(
    snapshot: TwinSnapshot,
    *,
    limit: int = 5,
    declined: KaiserMove | None = None,
) -> list[dict[str, Any]]:
    """Executable moves under current gate rules, ranked for `/moves/recommend`."""

    ranked: list[tuple[float, KaiserMove]] = []
    for dfn in iterate_move_definitions():
        if declined is not None and dfn.move == declined:
            continue
        if not _gates_ok(snapshot, dfn.move):
            continue
        headroom = snapshot.photon_reserve_pct - dfn.gates.min_photon_pct
        heat_margin = dfn.gates.max_allowed_heat_pct - snapshot.heat_pct
        score = headroom * 0.45 + heat_margin * 0.35 + float(dfn.telemetry.intensity)
        ranked.append((score, dfn.move))
    ranked.sort(key=lambda x: x[0], reverse=True)
    out: list[dict[str, Any]] = []
    for score, move in ranked[:limit]:
        dfn = get_move_definition(move)
        out.append(
            {
                "move_id": kaiser_move_slug(move),
                "canonical_name": move.value,
                "score": round(score, 4),
                "family": dfn.family.value,
                "tactical_tags": list(dfn.tactical_tags),
            },
        )
    return out


def suggest_alternative_moves(
    snapshot: TwinSnapshot,
    declined: KaiserMove | None = None,
    *,
    limit: int = 3,
) -> list[str]:
    """Return human-readable move names currently executable under gate rules."""
    rows = ranked_move_recommendations(snapshot, limit=limit, declined=declined)
    return [r["canonical_name"] for r in rows]


def tactical_move_hint(snapshot: TwinSnapshot, mode: PersonalityMode) -> str:
    """Non-authoritative narrative hint for LLM / cockpit copy."""
    if mode.name == "GUARDIAN_MODE":
        if snapshot.heat_pct > 78:
            return "Thermal envelope high — barrier-class techniques or venting directives recommended."
        if snapshot.structural_stress_pct > 45:
            return "Frame stress climbing — defensive lattice or actuator reset advised."
    if mode.name == "TACTICAL_MODE":
        if snapshot.photon_reserve_pct > 70 and snapshot.heat_pct < 60:
            return "Photon budget favorable for beam-class exchanges in simulation."
        if snapshot.cooldowns_remaining:
            return "Cooldown map active — rotate to alternate strike vectors."
    if snapshot.sync_rate_pct < 55:
        return "Synchro marginal — recalibration or lower-intensity packages reduce desync risk."
    return "Combat geometry nominal for continued simulated engagement."
