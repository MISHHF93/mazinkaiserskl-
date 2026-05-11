"""Map twin snapshot to HUD-facing Pydantic model."""

from __future__ import annotations

from datetime import UTC, datetime

from mazinkaiser.domain.mecha_state import MechaState
from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot


def project_to_mecha_state(snapshot: TwinSnapshot, mode: PersonalityMode) -> MechaState:
    return MechaState(
        photon_power_pct=snapshot.photon_reserve_pct,
        heat_level_pct=snapshot.heat_pct,
        reactor_output_pct=snapshot.reactor_output_pct,
        sync_rate_pct=snapshot.sync_rate_pct,
        armor_integrity_pct=snapshot.armor_integrity_pct,
        energy_reserve_pct=snapshot.energy_reserve_pct,
        movement_ready=snapshot.movement_ready,
        tactical_alert=snapshot.tactical_band,
        last_demo_move=snapshot.last_move_name,
        cooldowns=dict(snapshot.cooldowns_remaining),
        mode=mode,
        simulation_clock_s=snapshot.simulation_clock_s,
        twin_event_seq=snapshot.event_seq,
        structural_stress_pct=snapshot.structural_stress_pct,
        aux_routing_pct=snapshot.aux_routing_pct,
        synchro_bandwidth_pct=snapshot.synchro_bandwidth_pct,
        operational_state=snapshot.operational_state,
        scrander_status=snapshot.scrander_status,
        pilder_docking_status=snapshot.pilder_docking_status,
        movement_state=snapshot.movement_state,
        alerts_active=list(snapshot.alerts_active),
        simulated_damage_pct=snapshot.simulated_damage_pct,
        overdrive_risk_pct=snapshot.overdrive_risk_pct,
        nova_readiness_pct=snapshot.nova_readiness_pct,
        pilot_sync_pct=snapshot.pilot_sync_pct,
        pilot_stress_pct=snapshot.pilot_stress_pct,
        pilot_recognition_status=snapshot.pilot_recognition_status,
        pilot_biometric_confidence_pct=snapshot.pilot_biometric_confidence_pct,
        updated_at=datetime.now(UTC),
    )
