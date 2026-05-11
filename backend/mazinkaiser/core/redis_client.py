"""Redis client — stub until Prompt 7/10 wires connection pooling."""

from __future__ import annotations

from typing import Any

from mazinkaiser.core.config import get_settings


def get_redis() -> Any | None:
    """Return None if REDIS_URL unset (MVP in-process stores)."""
    settings = get_settings()
    if not settings.redis_url:
        return None
    # Lazy import to avoid redis dependency until used
    try:
        import redis as redis_pkg  # type: ignore[import-untyped]

        return redis_pkg.Redis.from_url(  # type: ignore[union-attr]
            str(settings.redis_url),
            decode_responses=True,
        )
    except ImportError:
        return None
