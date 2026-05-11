"""Kaiser Pilder docking + cockpit link envelope (simulation-only)."""

from __future__ import annotations

from fastapi import APIRouter

from mazinkaiser.api.deps import StateEngineDep
from mazinkaiser.api.schemas import PilderDockRequest, PilderStatusResponse, PilderUndockRequest
from mazinkaiser.domain.pilot_sync import pilot_sync_tier_from_pct
from mazinkaiser.domain.twin_state import TwinOperationalState
from mazinkaiser.simulation.pilder_authority import resolve_command_authority

DISCLAIMER = (
    "Simulation-only Pilder docking narrative — no real aircraft. Entertainment / training."
)

TIER_BANDS: dict[str, str] = {
    "0-20": "RESTRICTED",
    "21-50": "ASSISTED",
    "51-80": "COMBAT_READY",
    "81-99": "KAISER_SYNC",
    "100+": "OVERDRIVE_RISK",
}

router = APIRouter(prefix="/pilder", tags=["pilder"])


def _cockpit_telemetry(sess) -> dict:
    st = sess.state
    return {
        "photon_power_pct": st.photon_power_pct,
        "heat_level_pct": st.heat_level_pct,
        "sync_rate_pct": st.sync_rate_pct,
        "structural_stress_pct": st.structural_stress_pct,
        "armor_integrity_pct": st.armor_integrity_pct,
        "energy_reserve_pct": st.energy_reserve_pct,
        "movement_ready": st.movement_ready,
        "movement_state": st.movement_state.value,
        "scrander_status": st.scrander_status.value,
        "tactical_alert": st.tactical_alert,
    }


def _pilder_status(sess) -> PilderStatusResponse:
    snap = sess.twin_snapshot
    tier = pilot_sync_tier_from_pct(snap.pilot_sync_pct)
    auth = resolve_command_authority(snap)
    return PilderStatusResponse(
        session_id=sess.session_id,
        pilder_docking_status=snap.pilder_docking_status.value,
        pilot_sync_pct=snap.pilot_sync_pct,
        pilot_sync_tier=tier.value,
        pilot_sync_tier_bands=dict(TIER_BANDS),
        command_authority=auth.value,
        pilot_stress_pct=snap.pilot_stress_pct,
        pilot_recognition_status=snap.pilot_recognition_status.value,
        pilot_biometric_confidence_pct=snap.pilot_biometric_confidence_pct,
        operational_state=snap.operational_state.value,
        safe_shutdown_active=snap.operational_state == TwinOperationalState.SHUTDOWN_SAFE,
        cockpit_telemetry=_cockpit_telemetry(sess),
        disclaimer=DISCLAIMER,
    )


@router.post("/dock", response_model=PilderStatusResponse)
async def pilder_dock(body: PilderDockRequest, engine: StateEngineDep) -> PilderStatusResponse:
    sess = engine.get_or_create(body.session_id)
    sess.pilder_dock(sync_boost_pct=body.sync_boost_pct, recognize_pilot=body.recognize_pilot)
    return _pilder_status(sess)


@router.post("/undock", response_model=PilderStatusResponse)
async def pilder_undock(body: PilderUndockRequest, engine: StateEngineDep) -> PilderStatusResponse:
    sess = engine.get_or_create(body.session_id)
    sess.pilder_undock(emergency=body.emergency)
    return _pilder_status(sess)


@router.get("/status", response_model=PilderStatusResponse)
async def pilder_status(session_id: str | None = None, *, engine: StateEngineDep) -> PilderStatusResponse:
    sess = engine.get_or_create(session_id)
    sess.telemetry_read(advance_tick=False)
    return _pilder_status(sess)
