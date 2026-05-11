"""Session context bundle for logging and future RAG (structured, small)."""



from __future__ import annotations



from typing import Any



from mazinkaiser.domain.modes import PersonalityMode

from mazinkaiser.domain.pilot_sync import pilot_sync_tier_from_pct

from mazinkaiser.services.memory.session import SessionMemory

from mazinkaiser.services.state_engine import CockpitSession

from mazinkaiser.simulation.pilder_authority import resolve_command_authority





def build_session_context_dict(

    sess: CockpitSession,

    memory: SessionMemory,

    *,

    mode: PersonalityMode,

) -> dict[str, Any]:

    return {

        "session_id": sess.session_id,

        "mode": mode.value,

        "pilot_display_name": memory.pilot_display_name,

        "pilot_callsign": memory.pilot_callsign,

        "last_intent": memory.last_intent,

        "wake_strip_enabled": memory.wake_strip_enabled,

        "simulation_clock_s": sess.state.simulation_clock_s,

        "tactical_alert": sess.state.tactical_alert,

        "photon_pct": sess.state.photon_power_pct,

        "heat_pct": sess.state.heat_level_pct,

        "sync_pct": sess.state.sync_rate_pct,

        "operational_state": sess.twin_snapshot.operational_state.value,
        "scrander_status": sess.twin_snapshot.scrander_status.value,
        "pilder_status": sess.twin_snapshot.pilder_docking_status.value,
        "movement_state": sess.twin_snapshot.movement_state.value,
        "command_authority": resolve_command_authority(sess.twin_snapshot).value,
        "pilot_sync_pct": sess.twin_snapshot.pilot_sync_pct,
        "pilot_stress_pct": sess.twin_snapshot.pilot_stress_pct,
        "pilot_sync_tier": pilot_sync_tier_from_pct(sess.twin_snapshot.pilot_sync_pct).value,
        "pilot_recognition_status": sess.twin_snapshot.pilot_recognition_status.value,
        "overdrive_risk_pct": sess.state.overdrive_risk_pct,
        "nova_readiness_pct": sess.state.nova_readiness_pct,

    }


