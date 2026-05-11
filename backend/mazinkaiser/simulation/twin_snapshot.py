"""Authoritative numeric state for the Mazinkaiser digital twin (simulation-only)."""

from __future__ import annotations

from dataclasses import dataclass, field

from mazinkaiser.domain.pilot_sync import PilotRecognitionState
from mazinkaiser.domain.twin_state import (
    MovementTelemetryState,
    PilderDockingTelemetryStatus,
    ScranderTelemetryStatus,
    TwinOperationalState,
)


@dataclass
class TwinSnapshot:
    """Executable simulation state — projections map to HUD-facing `MechaState`."""

    photon_reserve_pct: float = 96.0
    heat_pct: float = 12.0
    reactor_output_pct: float = 78.0
    sync_rate_pct: float = 94.0
    armor_integrity_pct: float = 100.0
    energy_reserve_pct: float = 88.0
    movement_ready: bool = True
    tactical_band: str = "CLEAR"

    operational_state: TwinOperationalState = TwinOperationalState.IDLE
    scrander_status: ScranderTelemetryStatus = ScranderTelemetryStatus.STOWED
    pilder_docking_status: PilderDockingTelemetryStatus = PilderDockingTelemetryStatus.DOCKED
    movement_state: MovementTelemetryState = MovementTelemetryState.MOBILE

    alerts_active: list[str] = field(default_factory=list)

    simulated_damage_pct: float = 0.0
    overdrive_risk_pct: float = 16.0
    nova_readiness_pct: float = 24.0

    cooldowns_remaining: dict[str, float] = field(default_factory=dict)
    last_move_name: str | None = None

    simulation_clock_s: float = 0.0
    event_seq: int = 0

    structural_stress_pct: float = 0.0
    demo_residual_s: float = 0.0
    aux_routing_pct: float = 50.0
    synchro_bandwidth_pct: float = 92.0

    # Kaiser Pilder — pilot coupling (distinct from synchro `sync_rate_pct`)
    pilot_sync_pct: float = 72.0
    pilot_stress_pct: float = 16.0
    pilot_recognition_status: PilotRecognitionState = PilotRecognitionState.VERIFIED
    pilot_biometric_confidence_pct: float = 0.94
