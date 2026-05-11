"""Digital twin operational telemetry enums (simulation-only, not hardware)."""

from __future__ import annotations

from enum import StrEnum


class TwinOperationalState(StrEnum):
    """High-level Kaiser twin lifecycle / posture for HUD + APIs."""

    IDLE = "IDLE"
    DIAGNOSTIC = "DIAGNOSTIC"
    PILOT_SYNC = "PILOT_SYNC"
    COMBAT_SIMULATION = "COMBAT_SIMULATION"
    GUARDIAN = "GUARDIAN"
    OVERDRIVE = "OVERDRIVE"
    NOVA_PREP = "NOVA_PREP"
    CRITICAL_CORE = "CRITICAL_CORE"
    SHUTDOWN_SAFE = "SHUTDOWN_SAFE"


class ScranderTelemetryStatus(StrEnum):
    """Kaiser Scrander flight pack — narrative / simulation linkage."""

    STOWED = "STOWED"
    READY = "READY"
    DEPLOYED = "DEPLOYED"
    STRESS_WARNING = "STRESS_WARNING"


class PilderDockingTelemetryStatus(StrEnum):
    """Pilot craft docking interface."""

    DOCKED = "DOCKED"
    SEPARATED = "SEPARATED"
    SYNCING = "SYNCING"
    EMERGENCY_EGRESS_ARMED = "EMERGENCY_EGRESS_ARMED"


class MovementTelemetryState(StrEnum):
    """Translational agility readiness (simulated)."""

    IMMOBILE = "IMMOBILE"
    LIMITED = "LIMITED"
    MOBILE = "MOBILE"
    THROTTLED_THERMAL = "THROTTLED_THERMAL"
    BOOST_READY = "BOOST_READY"


class TwinStateInputEvent(StrEnum):
    """Validated ingestion events for `POST /api/v1/state/event`."""

    DIAGNOSTICS_RUN = "DIAGNOSTICS_RUN"
    SAFE_RESET_CORE = "SAFE_RESET_CORE"

    SIM_HEAT_SPIKE = "SIM_HEAT_SPIKE"
    SIM_COOLANT_ASSIST = "SIM_COOLANT_ASSIST"
    SIM_STRUCTURAL_STRIKE = "SIM_STRUCTURAL_STRIKE"
    SIM_SYNC_DEBT = "SIM_SYNC_DEBT"

    ARM_OVERDRIVE_SIM = "ARM_OVERDRIVE_SIM"
    RELEASE_OVERDRIVE_SIM = "RELEASE_OVERDRIVE_SIM"
    ARM_NOVA_PREP_SIM = "ARM_NOVA_PREP_SIM"
    RELEASE_NOVA_PREP_SIM = "RELEASE_NOVA_PREP_SIM"

    SCRANDER_DEPLOY = "SCRANDER_DEPLOY"
    SCRANDER_STOW = "SCRANDER_STOW"

    PILDER_SEPARATE = "PILDER_SEPARATE"
    PILDER_DOCK = "PILDER_DOCK"

    SET_OPERATIONAL_POSTURE = "SET_OPERATIONAL_POSTURE"
    SET_TACTICAL_BAND = "SET_TACTICAL_BAND"
    CLEAR_ALERTS = "CLEAR_ALERTS"
    APPEND_ALERT = "APPEND_ALERT"
