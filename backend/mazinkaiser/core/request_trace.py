"""Request-scoped trace IDs for audit + command correlation."""

from __future__ import annotations

from contextvars import ContextVar, Token

_trace_id_ctx: ContextVar[str | None] = ContextVar("mzk_trace_id", default=None)


def get_trace_id() -> str | None:
    return _trace_id_ctx.get()


def set_trace_id(trace_id: str) -> Token[str | None]:
    return _trace_id_ctx.set(trace_id)


def reset_trace_id(token: Token[str | None]) -> None:
    _trace_id_ctx.reset(token)


def require_trace_id(fallback: str) -> str:
    return get_trace_id() or fallback
