"""Digital twin state engine + telemetry (v1 REST, WebSocket-ready payloads)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from mazinkaiser.api.deps import StateEngineDep
from mazinkaiser.api.schemas import (
    DiagnosticsV1Request,
    StateEventRequest,
    StateResetRequest,
    TelemetryResponse,
)

router = APIRouter(tags=["state engine — v1"])


@router.get("/telemetry", response_model=TelemetryResponse)
async def get_telemetry(
    session_id: str | None = Query(default=None),
    advance_tick: bool = Query(
        default=True,
        description="When true, advances one idle-regulation step (simulated real-time refresh).",
    ),
    *,
    engine: StateEngineDep,
) -> TelemetryResponse:
    sess = engine.get_or_create(session_id)
    sess.telemetry_read(advance_tick=advance_tick)
    return TelemetryResponse(
        session_id=sess.session_id,
        telemetry=sess.state.model_dump_json_safe(),
        refreshed_with_tick=advance_tick,
    )


@router.post("/diagnostics", response_model=TelemetryResponse)
async def post_diagnostics_v1(
    body: DiagnosticsV1Request,
    engine: StateEngineDep,
) -> TelemetryResponse:
    sess = engine.get_or_create(body.session_id)
    sess.run_diagnostics()
    return TelemetryResponse(
        session_id=sess.session_id,
        telemetry=sess.state.model_dump_json_safe(),
        refreshed_with_tick=False,
    )


@router.post("/state/reset", response_model=TelemetryResponse)
async def post_state_reset(
    body: StateResetRequest,
    engine: StateEngineDep,
) -> TelemetryResponse:
    sess = engine.get_or_create(body.session_id)
    sess.reset_twin_safe()
    return TelemetryResponse(
        session_id=sess.session_id,
        telemetry=sess.state.model_dump_json_safe(),
        refreshed_with_tick=False,
    )


@router.post("/state/event", response_model=TelemetryResponse)
async def post_state_event(
    body: StateEventRequest,
    engine: StateEngineDep,
) -> TelemetryResponse:
    sess = engine.get_or_create(body.session_id)
    try:
        sess.apply_state_engine_event(body.event, dict(body.payload))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return TelemetryResponse(
        session_id=sess.session_id,
        telemetry=sess.state.model_dump_json_safe(),
        refreshed_with_tick=False,
    )
