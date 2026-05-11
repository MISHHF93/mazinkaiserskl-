"""Async SQLAlchemy session factory — returns None until DB wiring (Prompt 7+)."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

from mazinkaiser.core.config import get_settings

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


@asynccontextmanager
async def lifespan_session() -> AsyncIterator["AsyncSession | None"]:
    """Placeholder for future: yield AsyncSession when DATABASE_URL is configured."""
    _ = get_settings()
    yield None  # consumers must skip until real engine exists
