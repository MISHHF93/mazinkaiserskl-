"""Kubernetes-style liveness/readiness."""

from fastapi import APIRouter

from mazinkaiser import __version__

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def live() -> dict:
    return {"status": "alive", "service": "mazinkaiser-ai", "version": __version__}


@router.get("/health/ready")
async def ready() -> dict[str, object]:
    # Future: optionally verify DATABASE_URL ping, Redis, external AI reachability.
    return {
        "status": "ready",
        "service": "mazinkaiser-ai",
        "version": __version__,
        "checks": {
            "runtime": {"status": "ok", "detail": "in-process state engine reachable"},
            "critical_dependencies": {"status": "ok", "detail": "none required for MVP"},
        },
    }
