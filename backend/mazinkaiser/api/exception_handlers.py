"""Centralized JSON error responses (correlation id, production-safe shape)."""

from __future__ import annotations

import uuid

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = structlog.get_logger(__name__)


def _request_id(request: Request) -> str:
    rid = getattr(request.state, "request_id", None)
    if isinstance(rid, str) and rid:
        return rid
    # Before RequestContextMiddleware binds state (should be rare)
    return request.headers.get("x-request-id") or str(uuid.uuid4())


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        rid = _request_id(request)
        log.warning("request_validation_error", request_id=rid, errors=exc.errors())
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"detail": exc.errors(), "request_id": rid},
            headers={"X-Request-ID": rid},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        rid = _request_id(request)
        if exc.status_code >= 500:
            log.error("http_exception", request_id=rid, status_code=exc.status_code, detail=exc.detail)
        elif exc.status_code >= 400:
            log.warning("client_http_exception", request_id=rid, status_code=exc.status_code, detail=exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "request_id": rid},
            headers={"X-Request-ID": rid},
        )
