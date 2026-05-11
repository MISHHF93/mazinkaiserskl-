"""Executable simulation directives issued by tooling / deterministic AI adjuncts."""

from __future__ import annotations

from enum import StrEnum
from typing import Any

import random

from mazinkaiser.simulation.subsystems import clamp
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot


class SimulationDirective(StrEnum):
    """Twin kernel commands — simulated power routing and maintenance logic."""

    THERMAL_EMERGENCY_FLUSH = "THERMAL_EMERGENCY_FLUSH"
    SHUNT_AUX_TO_PHOTON = "SHUNT_AUX_TO_PHOTON"
    SYNC_RECALIBRATED = "SYNC_RECALIBRATED"
    ARMOR_LATTICE_HARDEN = "ARMOR_LATTICE_HARDEN"
    REACTOR_CAP_SAFEGUARD = "REACTOR_CAP_SAFEGUARD"
    MOVEMENT_ACTUATORS_RESET = "MOVEMENT_ACTUATORS_RESET"


def apply_directive(
    directive: SimulationDirective,
    snapshot: TwinSnapshot,
    rng: random.Random | None,
) -> dict[str, Any]:
    """Apply non-combat systemic adjustments (simulated)."""

    r = rng or random.Random()
    outcome: dict[str, Any] = {"directive": directive.value}

    if directive == SimulationDirective.THERMAL_EMERGENCY_FLUSH:
        snapshot.heat_pct = clamp(snapshot.heat_pct * (0.55 + r.uniform(0, 0.08)))

    elif directive == SimulationDirective.SHUNT_AUX_TO_PHOTON:
        delta = clamp(6.5 + r.uniform(0, 4.0))
        snapshot.aux_routing_pct = clamp(snapshot.aux_routing_pct - delta)
        snapshot.photon_reserve_pct = clamp(snapshot.photon_reserve_pct + delta * 0.38)

    elif directive == SimulationDirective.SYNC_RECALIBRATED:
        snapshot.sync_rate_pct = clamp(snapshot.sync_rate_pct + r.uniform(3.8, 7.2))
        snapshot.synchro_bandwidth_pct = clamp(snapshot.synchro_bandwidth_pct + r.uniform(1.2, 3.4))

    elif directive == SimulationDirective.ARMOR_LATTICE_HARDEN:
        snapshot.armor_integrity_pct = clamp(snapshot.armor_integrity_pct + r.uniform(0.5, 2.4))
        snapshot.structural_stress_pct = clamp(snapshot.structural_stress_pct - r.uniform(3.0, 6.4))

    elif directive == SimulationDirective.REACTOR_CAP_SAFEGUARD:
        snapshot.reactor_output_pct = clamp(snapshot.reactor_output_pct - r.uniform(4.0, 9.0))
        snapshot.heat_pct = clamp(snapshot.heat_pct - r.uniform(1.2, 3.2))

    elif directive == SimulationDirective.MOVEMENT_ACTUATORS_RESET:
        snapshot.movement_ready = True
        snapshot.sync_rate_pct = clamp(snapshot.sync_rate_pct + r.uniform(0.5, 1.6))

    return outcome
