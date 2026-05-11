"""Read-only audit stream (bounded in-process buffer + mirrored JSON lines on disk)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from mazinkaiser.api.schemas import AuditEventsResponse
from mazinkaiser.services.audit.service import AuditKind, read_recent_audit_events

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/events", response_model=AuditEventsResponse)
async def list_audit_events(
    session_id: str | None = Query(default=None, description="Filter rows for a cockpit session id"),
    limit: int = Query(default=120, ge=1, le=800),
    kind: AuditKind | None = Query(default=None),
) -> AuditEventsResponse:
    rows = read_recent_audit_events(limit=limit, session_id=session_id, kind=kind)
    return AuditEventsResponse(events=rows)
