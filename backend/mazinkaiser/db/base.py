"""SQLAlchemy declarative base — wire engines in `db.session` when DATABASE_URL is set."""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Future ORM models inherit from this class."""
