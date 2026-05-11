"""Apply validated twin state input events (deterministic simulation)."""

from __future__ import annotations

import random
from typing import Any

from mazinkaiser.domain.pilot_sync import PilotRecognitionState
from mazinkaiser.domain.twin_state import (
    PilderDockingTelemetryStatus,
    ScranderTelemetryStatus,
    TwinOperationalState,
    TwinStateInputEvent,
)
from mazinkaiser.simulation.subsystems import apply_structural_shock
from mazinkaiser.simulation.twin_derived import recompute_derived_telemetry, sync_movement_state
from mazinkaiser.simulation.twin_validate import (
    clamp_pct,
    clamp_snapshot_inplace,
    validate_alert_message,
    validate_posture_token,
    validate_tactical_band,
)
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot


def apply_twin_state_input_event(
    snapshot: TwinSnapshot,
    event: TwinStateInputEvent,
    payload: dict[str, Any],
    rng: random.Random,
) -> dict[str, Any]:
    """
    Mutate `snapshot` according to `event` / `payload`.
    Raises ValueError on illegal transitions or bad payload.
    Always leaves the snapshot clamped + derived fields refreshed.
    """

    result: dict[str, Any] = {"event": event.value, "applied": True}

    if snapshot.operational_state == TwinOperationalState.SHUTDOWN_SAFE and event not in frozenset(
        {
            TwinStateInputEvent.SAFE_RESET_CORE,
            TwinStateInputEvent.SET_OPERATIONAL_POSTURE,
        },
    ):
        raise ValueError("Twin is in SHUTDOWN_SAFE — only recovery posture events are accepted.")

    match event:
        case TwinStateInputEvent.SIM_HEAT_SPIKE:
            delta = float(payload.get("delta", 10.0))
            if not (0.5 <= delta <= 40.0):
                raise ValueError("delta must be between 0.5 and 40")
            snapshot.heat_pct = clamp_pct(snapshot.heat_pct + delta)
            note = validate_alert_message(str(payload.get("note", "Simulated heat anomaly")))
            snapshot.alerts_active.append(note)
            snapshot.operational_state = TwinOperationalState.COMBAT_SIMULATION

        case TwinStateInputEvent.SIM_COOLANT_ASSIST:
            drop = float(payload.get("drop", 8.0))
            if not (1.0 <= drop <= 35.0):
                raise ValueError("drop must be between 1 and 35")
            snapshot.heat_pct = clamp_pct(snapshot.heat_pct - drop)
            snapshot.energy_reserve_pct = clamp_pct(snapshot.energy_reserve_pct - rng.uniform(0.5, 2.5))

        case TwinStateInputEvent.SIM_STRUCTURAL_STRIKE:
            impulse = float(payload.get("impulse", 12.0))
            if not (1.0 <= impulse <= 48.0):
                raise ValueError("impulse must be between 1 and 48")
            apply_structural_shock(snapshot, impulse)
            snapshot.armor_integrity_pct = clamp_pct(snapshot.armor_integrity_pct - impulse * 0.25)
            snapshot.alerts_active.append(validate_alert_message("Simulated structural impact."))

        case TwinStateInputEvent.SIM_SYNC_DEBT:
            shave = float(payload.get("shave", 6.0))
            if not (1.0 <= shave <= 30.0):
                raise ValueError("shave must be between 1 and 30")
            snapshot.sync_rate_pct = clamp_pct(snapshot.sync_rate_pct - shave)
            snapshot.synchro_bandwidth_pct = clamp_pct(snapshot.synchro_bandwidth_pct - shave * 0.45)

        case TwinStateInputEvent.ARM_OVERDRIVE_SIM:
            snapshot.operational_state = TwinOperationalState.OVERDRIVE
            snapshot.reactor_output_pct = clamp_pct(snapshot.reactor_output_pct + rng.uniform(4.0, 9.0))
            snapshot.alerts_active.append(validate_alert_message("Overdrive lane armed (simulation)."))

        case TwinStateInputEvent.RELEASE_OVERDRIVE_SIM:
            if snapshot.operational_state == TwinOperationalState.OVERDRIVE:
                snapshot.operational_state = TwinOperationalState.IDLE
            snapshot.reactor_output_pct = clamp_pct(snapshot.reactor_output_pct - rng.uniform(2.0, 6.5))

        case TwinStateInputEvent.ARM_NOVA_PREP_SIM:
            snapshot.operational_state = TwinOperationalState.NOVA_PREP
            snapshot.nova_readiness_pct = clamp_pct(snapshot.nova_readiness_pct + 18.0)

        case TwinStateInputEvent.RELEASE_NOVA_PREP_SIM:
            snapshot.operational_state = TwinOperationalState.PILOT_SYNC
            snapshot.nova_readiness_pct = clamp_pct(snapshot.nova_readiness_pct - 12.0)

        case TwinStateInputEvent.SCRANDER_DEPLOY:
            snapshot.scrander_status = ScranderTelemetryStatus.DEPLOYED
            snapshot.movement_ready = True

        case TwinStateInputEvent.SCRANDER_STOW:
            snapshot.scrander_status = ScranderTelemetryStatus.STOWED

        case TwinStateInputEvent.PILDER_SEPARATE:
            snapshot.pilder_docking_status = PilderDockingTelemetryStatus.SEPARATED
            snapshot.sync_rate_pct = clamp_pct(snapshot.sync_rate_pct - rng.uniform(1.8, 4.6))
            snapshot.pilot_recognition_status = PilotRecognitionState.LATENT
            snapshot.pilot_stress_pct = clamp_pct(snapshot.pilot_stress_pct + rng.uniform(2.0, 7.5))
            snapshot.pilot_sync_pct = clamp_pct(snapshot.pilot_sync_pct - rng.uniform(1.5, 5.0), 0.0, 125.0)

        case TwinStateInputEvent.PILDER_DOCK:
            snapshot.sync_rate_pct = clamp_pct(snapshot.sync_rate_pct + rng.uniform(2.8, 5.8))
            snapshot.pilder_docking_status = PilderDockingTelemetryStatus.DOCKED
            snapshot.pilot_recognition_status = PilotRecognitionState.VERIFIED

        case TwinStateInputEvent.SET_OPERATIONAL_POSTURE:
            raw = payload.get("posture")
            if raw is None:
                raise ValueError("payload.posture required")
            target = validate_posture_token(str(raw), TwinOperationalState)
            if snapshot.operational_state == TwinOperationalState.SHUTDOWN_SAFE and target not in (
                TwinOperationalState.IDLE,
                TwinOperationalState.DIAGNOSTIC,
                TwinOperationalState.PILOT_SYNC,
            ):
                raise ValueError(f"Illegal recovery posture from SHUTDOWN_SAFE: {target}")
            snapshot.operational_state = target

        case TwinStateInputEvent.SET_TACTICAL_BAND:
            raw = payload.get("band", "CLEAR")
            snapshot.tactical_band = validate_tactical_band(str(raw))

        case TwinStateInputEvent.CLEAR_ALERTS:
            snapshot.alerts_active.clear()

        case TwinStateInputEvent.APPEND_ALERT:
            snapshot.alerts_active.append(validate_alert_message(str(payload.get("message", ""))))

        case TwinStateInputEvent.SAFE_RESET_CORE:
            snapshot.operational_state = TwinOperationalState.IDLE
            snapshot.movement_ready = True
            snapshot.pilder_docking_status = PilderDockingTelemetryStatus.DOCKED
            snapshot.scrander_status = ScranderTelemetryStatus.STOWED
            snapshot.tactical_band = "CLEAR"
            snapshot.pilot_recognition_status = PilotRecognitionState.VERIFIED
            snapshot.pilot_biometric_confidence_pct = clamp_pct(snapshot.pilot_biometric_confidence_pct + 8.0)

        case TwinStateInputEvent.DIAGNOSTICS_RUN:
            raise RuntimeError("DIAGNOSTICS_RUN must be routed through DigitalTwinKernel.run_diagnostics")

    recompute_derived_telemetry(snapshot)
    sync_movement_state(snapshot)
    clamp_snapshot_inplace(snapshot)
    result["telemetry_digest"] = {
        "operational_state": snapshot.operational_state.value,
        "heat_pct": snapshot.heat_pct,
        "sync_pct": snapshot.sync_rate_pct,
    }
    return result
