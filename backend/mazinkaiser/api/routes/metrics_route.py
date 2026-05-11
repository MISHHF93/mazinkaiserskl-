"""Optional Prometheus exposition (plaintext)."""

from __future__ import annotations

from fastapi import APIRouter, Response

from mazinkaiser.core.config import get_settings
from mazinkaiser.observability.metrics import render_metrics_registry

router = APIRouter(tags=["metrics"])


@router.get("/metrics")
async def metrics() -> Response:
    if not get_settings().expose_metrics:
        return Response(content="# metrics disabled\n", media_type="text/plain; charset=utf-8")
    body = render_metrics_registry()
    return Response(content=body, media_type="text/plain; charset=utf-8")
