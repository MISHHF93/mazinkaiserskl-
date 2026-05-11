"""Pilot synchronization + profile endpoints (simulation-only)."""

from __future__ import annotations

from fastapi import APIRouter

from mazinkaiser.api.deps import StateEngineDep
from mazinkaiser.api.schemas import PilotProfileResponse, PilotSyncRequest, PilotSyncResponse
from mazinkaiser.domain.pilot_sync import pilot_sync_tier_from_pct
from mazinkaiser.runtime import get_memory
from mazinkaiser.simulation.pilder_authority import resolve_command_authority

DISCLAIMER = "Simulation-only pilot link — training narrative / digital twin HUD."

router = APIRouter(prefix="/pilot", tags=["pilot"])


@router.post("/sync", response_model=PilotSyncResponse)
async def pilot_sync(body: PilotSyncRequest, engine: StateEngineDep) -> PilotSyncResponse:
    sess = engine.get_or_create(body.session_id)
    sess.pilot_sync_update(
        target_pilot_sync_pct=body.target_pilot_sync_pct,
        pilot_sync_delta_pct=body.pilot_sync_delta_pct,
        stress_delta_pct=body.stress_delta_pct,
        alleviate_stress=body.alleviate_stress,
        initiate_safe_shutdown=body.initiate_safe_shutdown,
        recognize_pilot=body.recognize_pilot,
    )
    snap = sess.twin_snapshot
    return PilotSyncResponse(
        session_id=sess.session_id,
        state=sess.state.model_dump_json_safe(),
        pilot_sync_tier=pilot_sync_tier_from_pct(snap.pilot_sync_pct).value,
        command_authority=resolve_command_authority(snap).value,
    )


@router.get("/profile", response_model=PilotProfileResponse)
async def pilot_profile(session_id: str | None = None, *, engine: StateEngineDep) -> PilotProfileResponse:
    sess = engine.get_or_create(session_id)
    sess.telemetry_read(advance_tick=False)
    mem = get_memory(sess.session_id)
    snap = sess.twin_snapshot
    return PilotProfileResponse(
        session_id=sess.session_id,
        display_name=mem.pilot_display_name,
        callsign=mem.pilot_callsign,
        recognition_status=snap.pilot_recognition_status.value,
        biometric_confidence_pct=snap.pilot_biometric_confidence_pct,
        pilot_sync_pct=snap.pilot_sync_pct,
        pilot_sync_tier=pilot_sync_tier_from_pct(snap.pilot_sync_pct).value,
        pilot_stress_pct=snap.pilot_stress_pct,
        command_authority=resolve_command_authority(snap).value,
        pilder_docking_status=snap.pilder_docking_status.value,
        operational_state=snap.operational_state.value,
        disclaimer=DISCLAIMER,
    )
