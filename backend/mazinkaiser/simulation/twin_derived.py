"""Derived telemetry (overdrive / Nova / movement) from base twin fields."""

from __future__ import annotations

from mazinkaiser.domain.twin_state import (
    MovementTelemetryState,
    PilderDockingTelemetryStatus,
    ScranderTelemetryStatus,
    TwinOperationalState,
)
from mazinkaiser.simulation.twin_validate import clamp_pct, clamp_snapshot_inplace
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot


def recompute_derived_telemetry(snapshot: TwinSnapshot) -> None:
    """Fill derived gauges used by HUD and instinct overlays."""

    snapshot.overdrive_risk_pct = clamp_pct(
        snapshot.heat_pct * 0.38 + snapshot.reactor_output_pct * 0.21 + (100.0 - snapshot.sync_rate_pct) * 0.26
    )
    snapshot.nova_readiness_pct = clamp_pct(
        snapshot.photon_reserve_pct * 0.41
        + snapshot.reactor_output_pct * 0.33
        - snapshot.heat_pct * 0.34
        + 10.0
    )
    snapshot.simulated_damage_pct = clamp_pct(
        (100.0 - snapshot.armor_integrity_pct) + snapshot.structural_stress_pct * 0.30
    )
    _sync_scrander_warning(snapshot)
    _auto_operational_pressure(snapshot)


def sync_movement_state(snapshot: TwinSnapshot) -> None:
    if snapshot.operational_state == TwinOperationalState.SHUTDOWN_SAFE:
        snapshot.movement_ready = False
        snapshot.movement_state = MovementTelemetryState.IMMOBILE
        return
    if not snapshot.movement_ready:
        snapshot.movement_state = MovementTelemetryState.IMMOBILE
    elif snapshot.pilder_docking_status == PilderDockingTelemetryStatus.SEPARATED:
        snapshot.movement_state = MovementTelemetryState.LIMITED
    elif snapshot.heat_pct >= 88.0:
        snapshot.movement_state = MovementTelemetryState.THROTTLED_THERMAL
    elif snapshot.structural_stress_pct >= 58.0:
        snapshot.movement_state = MovementTelemetryState.LIMITED
    elif snapshot.sync_rate_pct >= 88.0 and snapshot.heat_pct < 62.0 and snapshot.movement_ready:
        snapshot.movement_state = MovementTelemetryState.BOOST_READY
    else:
        snapshot.movement_state = MovementTelemetryState.MOBILE


def _sync_scrander_warning(snapshot: TwinSnapshot) -> None:
    if snapshot.scrander_status == ScranderTelemetryStatus.STRESS_WARNING:
        if snapshot.structural_stress_pct < 34.0:
            snapshot.scrander_status = ScranderTelemetryStatus.DEPLOYED
    elif snapshot.scrander_status == ScranderTelemetryStatus.DEPLOYED:
        if snapshot.structural_stress_pct > 48.0:
            snapshot.scrander_status = ScranderTelemetryStatus.STRESS_WARNING


def _auto_operational_pressure(snapshot: TwinSnapshot) -> None:
    """Soft coupling of posture to dangerous telemetry (simulation training)."""

    if snapshot.operational_state in (
        TwinOperationalState.SHUTDOWN_SAFE,
        TwinOperationalState.DIAGNOSTIC,
    ):
        return
    if snapshot.heat_pct >= 94.0 and snapshot.sync_rate_pct < 45.0:
        if snapshot.operational_state != TwinOperationalState.CRITICAL_CORE:
            _append_unique_alert(snapshot, "AUTO_CORE_DECLARED: thermal + synchro crisis (simulation).")
        snapshot.operational_state = TwinOperationalState.CRITICAL_CORE
    elif snapshot.operational_state == TwinOperationalState.CRITICAL_CORE:
        if snapshot.heat_pct < 72.0 and snapshot.sync_rate_pct > 68.0:
            snapshot.operational_state = TwinOperationalState.IDLE


def _append_unique_alert(snapshot: TwinSnapshot, message: str) -> None:
    if message not in snapshot.alerts_active:
        snapshot.alerts_active.append(message)
    clamp_snapshot_inplace(snapshot)
