"""Filesystem anchors for Mazinkaiser publish artifacts."""

from __future__ import annotations

from pathlib import Path


def repo_root() -> Path:
    """Repository root (`Mazinkaiser AI/`). Package lives at `{root}/backend/mazinkaiser/...`."""

    return Path(__file__).resolve().parents[4]
