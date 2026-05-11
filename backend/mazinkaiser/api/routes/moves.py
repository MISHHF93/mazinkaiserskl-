"""Kaiser Action Orchestration — canonical move catalogue + batch simulate (training only)."""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status

from mazinkaiser.api.deps import StateEngineDep
from mazinkaiser.core.request_trace import get_trace_id
from mazinkaiser.realtime.notify import notify_move_execution
from mazinkaiser.api.schemas import (
    MoveRecommendRequest,
    MoveRecommendResponse,
    MoveRecommendationItem,
    MoveSimulationRequest,
    MoveSimulationResponse,
)
from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.domain.moves import MOVE_METADATA, kaiser_move_from_slug_or_raise, kaiser_move_slug
from mazinkaiser.simulation.move_execution.advisor import ranked_move_recommendations, tactical_move_hint
from mazinkaiser.simulation.move_execution.batch_models import BatchStepKind
from mazinkaiser.simulation.move_execution.registry import get_move_definition, iterate_move_definitions

router = APIRouter(prefix="/moves", tags=["moves"])

_DISCLAIMER = (
    "Simulation-only Mazinkaiser digital twin — no real-world weaponization or effects. "
    "All execution is cinematic / telemetry training."
)

_BATCH_PHASES: tuple[str, ...] = tuple(s.value for s in BatchStepKind)


def _serialize_definition(dfn, *, extended: bool) -> dict[str, Any]:
    meta = MOVE_METADATA.get(dfn.move, {})
    row: dict[str, Any] = {
        "move_id": kaiser_move_slug(dfn.move),
        "canonical_name": dfn.move.value,
        "metadata": dict(meta),
        "family": dfn.family.value,
        "narrative_id": dfn.narrative_id,
        "adapter_hook": dfn.adapter_hook,
        "tactical_tags": list(dfn.tactical_tags),
        "prep_simulation_s": dfn.prep_simulation_s,
    }
    if not extended:
        return row
    cues = [
        {
            "phase": c.phase,
            "hud_event": c.hud_event,
            "duration_ms": c.duration_ms,
            "severity": c.severity,
            "payload": c.payload,
        }
        for c in dfn.animation_cues
    ]
    row["gates"] = asdict(dfn.gates)
    row["telemetry_coefficients"] = asdict(dfn.telemetry)
    row["animation_cues"] = cues
    row["voice_template_keys"] = {
        "success": "voice_success_fmt",
        "refused_gate": "voice_refused_gate_fmt",
        "refused_cooldown": "voice_refused_cooldown_fmt",
    }
    return row


@router.get("")
async def list_moves(extended: bool = Query(default=False)) -> dict[str, Any]:
    entries = [_serialize_definition(dfn, extended=extended) for dfn in iterate_move_definitions()]
    return {
        "disclaimer": _DISCLAIMER,
        "batch_execution_phases": list(_BATCH_PHASES),
        "moves": entries,
        "extensions": {"count": len(entries), "schema_version": 1},
    }


@router.post("/recommend", response_model=MoveRecommendResponse)
async def recommend_moves(body: MoveRecommendRequest, engine: StateEngineDep) -> MoveRecommendResponse:
    """Rank executable moves from current twin telemetry + tactical posture (advisor)."""

    sess = engine.get_or_create(body.session_id)
    mode: PersonalityMode = body.mode or sess.state.mode
    snap = sess.twin_snapshot
    recs = ranked_move_recommendations(snap, limit=body.limit, declined=None)
    hint = tactical_move_hint(snap, mode)
    items = [MoveRecommendationItem(**r) for r in recs]
    return MoveRecommendResponse(
        session_id=sess.session_id,
        mode=mode,
        tactical_hint=hint,
        recommendations=items,
        disclaimer=_DISCLAIMER,
    )


@router.get("/{move_id}")
async def get_move(move_id: str, extended: bool = Query(default=True)) -> dict[str, Any]:
    """Single move definition (`extended=false` omits gates/telemetry/cue graph)."""

    try:
        km = kaiser_move_from_slug_or_raise(move_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    dfn = get_move_definition(km)
    return {
        **_serialize_definition(dfn, extended=extended),
        "disclaimer": _DISCLAIMER,
        "batch_execution_phases": list(_BATCH_PHASES),
    }


@router.post("/{move_id}/simulate", response_model=MoveSimulationResponse)
async def simulate_move(move_id: str, body: MoveSimulationRequest, engine: StateEngineDep) -> MoveSimulationResponse:
    """Run the full 14-phase batch on the session twin (same engine as `/cockpit/move-demo`)."""

    try:
        km = kaiser_move_from_slug_or_raise(move_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    sess = engine.get_or_create(body.session_id)
    if body.mode is not None:
        sess.set_mode(body.mode)
    sess.trigger_move_demo(km, pilot_authorized=body.pilot_authorized, strict_safety=body.strict_safety)
    batch = sess.last_move_batch or {}
    await notify_move_execution(
        sess.session_id,
        batch,
        trace_id=get_trace_id(),
        telemetry=sess.state.model_dump_json_safe(),
    )
    return MoveSimulationResponse(
        session_id=sess.session_id,
        move_id=kaiser_move_slug(km),
        canonical_name=km.value,
        state=sess.state.model_dump_json_safe(),
        move_batch=batch,
        disclaimer=_DISCLAIMER,
    )
