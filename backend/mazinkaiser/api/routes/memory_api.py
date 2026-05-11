"""Session memory inspection + preference merges (privacy-safe summaries)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from mazinkaiser.api.deps import StateEngineDep
from mazinkaiser.api.schemas import MemoryPreferencePayload, MemorySessionEnvelope
from mazinkaiser.memory.vector_adapter import null_vector_adapter_status
from mazinkaiser.runtime import get_memory
from mazinkaiser.services.audit.service import log_audit_event

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("/session", response_model=MemorySessionEnvelope)
async def get_session_memory_snapshot(
    session_id: str | None = Query(default=None),
    *,
    engine: StateEngineDep,
) -> MemorySessionEnvelope:
    sess = engine.get_or_create(session_id)
    mem = get_memory(sess.session_id)
    return MemorySessionEnvelope(
        session_id=sess.session_id,
        memory=mem.export_api_safe(),
        privacy_notice=(
            "Ephemeral cockpit session envelope: no centralized pilot profiling. "
            "Avatar payloads are summarized (not echoed). Rotate sessions to discard residual context."
        ),
        vector_adapter=null_vector_adapter_status(),
    )


@router.post("/preference", response_model=MemorySessionEnvelope)
async def merge_session_preferences(
    body: MemoryPreferencePayload,
    *,
    engine: StateEngineDep,
) -> MemorySessionEnvelope:
    sess = engine.get_or_create(body.session_id)
    mem = get_memory(sess.session_id)
    mem.merge_preferences(body.preferences)

    log_audit_event(
        "preference_update",
        {"keys_updated": sorted(body.preferences.keys())[:48]},
        session_id=sess.session_id,
    )
    log_audit_event(
        "memory_update",
        {"surface": "preferences", "preference_key_count": len(mem.preferences)},
        session_id=sess.session_id,
    )

    return MemorySessionEnvelope(
        session_id=sess.session_id,
        memory=mem.export_api_safe(),
        privacy_notice=(
            "Merged keys are capped and stored session-local only unless you integrate external KV/DB."
        ),
        vector_adapter=null_vector_adapter_status(),
    )
