"""Normalize pilot utterances: optional wake-prefix stripping for command focus."""

from __future__ import annotations

from mazinkaiser.services.memory.session import SessionMemory


def normalize_pilot_utterance(text: str, memory: SessionMemory) -> str:
    """Strip leading wake-style prefixes once (case-insensitive on ASCII prefixes)."""
    t = text.strip()
    if not memory.wake_strip_enabled:
        return t

    lower = t.lower()
    best: str | None = None
    best_len = 0
    for p in memory.wake_prefixes:
        pl = p.lower()
        if lower.startswith(pl) and len(p) >= best_len:
            best = p
            best_len = len(p)

    if best is not None:
        t = t[len(best) :].lstrip(" \t,:")

    return t.strip()
