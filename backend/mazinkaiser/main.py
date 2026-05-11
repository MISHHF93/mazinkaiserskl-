"""FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mazinkaiser import __version__
from mazinkaiser.api.exception_handlers import register_exception_handlers
from mazinkaiser.api.routes import (
    audit_api,
    cockpit,
    cognitive,
    health,
    memory_api,
    metrics_route,
    moves,
    pilot,
    pilder,
    safety_api,
    telemetry,
    voice,
    websocket,
)
from mazinkaiser.api.version import API_VERSION
from mazinkaiser.core.config import get_settings
from mazinkaiser.core.logging import configure_logging
from mazinkaiser.middleware import RequestContextMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(
        json_logs=settings.environment == "production",
        log_level="DEBUG" if settings.debug else "INFO",
    )
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        lifespan=lifespan,
        description=(
            f"REST API **{API_VERSION}** mounted at `{settings.api_prefix}`. "
            "WebSocket: `/ws/cockpit` (optional `?topics=telemetry,avatar,moves,assistant`). "
            f"HUD tick interval ≈ `{settings.ws_telemetry_interval_s}`s when streaming."
        ),
    )
    register_exception_handlers(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestContextMiddleware)

    app.include_router(health.router)
    app.include_router(metrics_route.router)
    app.include_router(cognitive.router, prefix=settings.api_prefix)
    app.include_router(telemetry.router, prefix=settings.api_prefix)
    app.include_router(cockpit.router, prefix=settings.api_prefix)
    app.include_router(moves.router, prefix=settings.api_prefix)
    app.include_router(pilder.router, prefix=settings.api_prefix)
    app.include_router(pilot.router, prefix=settings.api_prefix)
    app.include_router(voice.router, prefix=settings.api_prefix)
    app.include_router(memory_api.router, prefix=settings.api_prefix)
    app.include_router(audit_api.router, prefix=settings.api_prefix)
    app.include_router(safety_api.router, prefix=settings.api_prefix)
    app.include_router(websocket.router)

    return app


app = create_app()
