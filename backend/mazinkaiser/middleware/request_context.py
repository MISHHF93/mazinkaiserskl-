"""HTTP middleware: request correlation and JSON error envelope."""

from __future__ import annotations

import uuid
from collections.abc import Callable

import structlog
from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

from mazinkaiser.core.request_trace import reset_trace_id, set_trace_id
from mazinkaiser.observability.metrics import HTTP_REQUESTS_TOTAL

log = structlog.get_logger(__name__)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    - Propagates X-Request-ID (or generates UUID) for audit + command tracing.
    - Maps unexpected exceptions to a safe JSON 500 (no stack traces to clients).
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable[[Request], Response]) -> Response:
        rid = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = rid
        HTTP_REQUESTS_TOTAL.inc()
        token = set_trace_id(rid)
        try:
            try:
                response = await call_next(request)
            except RequestValidationError:
                raise
            except (HTTPException, StarletteHTTPException):
                raise
            except Exception:  # noqa: BLE001 — intentional last-resort envelope
                log.exception("unhandled_http", request_id=rid, path=request.url.path)
                return JSONResponse(
                    status_code=500,
                    content={"detail": "INTERNAL_ERROR", "request_id": rid},
                    headers={"X-Request-ID": rid},
                )

            response.headers.setdefault("X-Request-ID", rid)
            return response
        finally:
            reset_trace_id(token)
