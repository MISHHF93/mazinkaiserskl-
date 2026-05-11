"""Simulated mecha telemetry — entertainment only, not real hardware."""



from datetime import UTC, datetime

from typing import Any



from pydantic import BaseModel, Field, field_validator



from mazinkaiser.domain.modes import PersonalityMode

from mazinkaiser.domain.pilot_sync import PilotRecognitionState

from mazinkaiser.domain.twin_state import (

    MovementTelemetryState,

    PilderDockingTelemetryStatus,

    ScranderTelemetryStatus,

    TwinOperationalState,

)





class MechaState(BaseModel):

    """HUD-facing simulated state — full digital twin projection for real-time feeds."""



    photon_power_pct: float = Field(ge=0, le=100, default=96.0)

    armor_integrity_pct: float = Field(ge=0, le=100, default=100.0)

    heat_level_pct: float = Field(ge=0, le=100, default=12.0)

    reactor_output_pct: float = Field(ge=0, le=100, default=78.0)

    sync_rate_pct: float = Field(ge=0, le=100, default=94.0)

    movement_ready: bool = True

    tactical_alert: str = "CLEAR"

    energy_reserve_pct: float = Field(ge=0, le=100, default=88.0)

    mode: PersonalityMode = PersonalityMode.KAISER_CORE_MODE

    last_demo_move: str | None = None

    cooldowns: dict[str, float] = Field(default_factory=dict)

    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))



    simulation_clock_s: float = Field(ge=0, default=0.0, description="Monotonic twin simulation time (seconds).")

    twin_event_seq: int = Field(ge=0, default=0, description="Last emitted twin event sequence.")

    structural_stress_pct: float = Field(ge=0, default=0.0, description="Frame stress from simulated loads.")

    aux_routing_pct: float = Field(ge=0, le=100, default=50.0, description="Auxiliary bus routing headroom.")

    synchro_bandwidth_pct: float = Field(ge=0, le=100, default=92.0, description="Synchro channel capacity.")



    operational_state: TwinOperationalState = TwinOperationalState.IDLE

    scrander_status: ScranderTelemetryStatus = ScranderTelemetryStatus.STOWED

    pilder_docking_status: PilderDockingTelemetryStatus = (

        PilderDockingTelemetryStatus.DOCKED

    )

    movement_state: MovementTelemetryState = MovementTelemetryState.MOBILE

    alerts_active: list[str] = Field(default_factory=list)

    simulated_damage_pct: float = Field(ge=0, le=100, default=0.0)

    overdrive_risk_pct: float = Field(ge=0, le=100, default=16.0)

    nova_readiness_pct: float = Field(ge=0, le=100, default=24.0)

    pilot_sync_pct: float = Field(ge=0, le=125, default=72.0, description="Pilot–Mazin link tier input (HUD).")
    pilot_stress_pct: float = Field(ge=0, le=100, default=16.0, description="Cognitive/load stress simulation.")
    pilot_recognition_status: PilotRecognitionState = PilotRecognitionState.VERIFIED
    pilot_biometric_confidence_pct: float = Field(
        ge=0,
        le=100,
        default=94.0,
        description="Simulated biometric handshake strength for HUD.",
    )


    @field_validator("alerts_active")

    @classmethod

    def cap_alerts(cls, v: list[str]) -> list[str]:

        return v[-24:] if len(v) > 24 else v



    def model_dump_json_safe(self) -> dict[str, Any]:

        d = self.model_dump(mode="json")

        d["mode"] = str(self.mode.value)

        d["operational_state"] = self.operational_state.value

        d["scrander_status"] = self.scrander_status.value

        d["pilder_docking_status"] = self.pilder_docking_status.value

        d["movement_state"] = self.movement_state.value

        d["pilot_recognition_status"] = self.pilot_recognition_status.value

        d["updated_at"] = self.updated_at.isoformat()

        return d


