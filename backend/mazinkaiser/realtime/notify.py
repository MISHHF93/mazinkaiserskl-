"""Fire-and-forget hooks for REST paths to push move events to WebSocket subscribers."""

from __future__ import annotations

from typing import Any

from mazinkaiser.observability.metrics import REALTIME_MOVES_PUBLISHED_TOTAL
from mazinkaiser.realtime.hub import get_realtime_hub


async def notify_move_execution(
    session_id: str,
    move_batch: dict[str, Any],
    *,
    trace_id: str | None = None,
    telemetry: dict[str, Any] | None = None,
) -> None:
    REALTIME_MOVES_PUBLISHED_TOTAL.inc()
    await get_realtime_hub().broadcast_move_event(
        session_id,
        move_batch=move_batch,
        trace_id=trace_id,
        telemetry=telemetry,
    )
