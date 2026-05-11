"""Voice-specific normalization on top of wake-prefix stripping."""

from __future__ import annotations

import re
import unicodedata

from mazinkaiser.services.memory.session import SessionMemory
from mazinkaiser.services.command_preprocess import normalize_pilot_utterance


_WS_RE = re.compile(r"\s+")


def normalize_voice_transcript(raw: str) -> str:
    """Lightweight cleanup before wake stripping (browser STT quirks)."""

    t = unicodedata.normalize("NFKC", raw or "")
    t = _WS_RE.sub(" ", t).strip()
    return t


def normalize_voice_command(transcript: str, memory: SessionMemory) -> tuple[str, str]:
    """
    Returns (raw_clean, wake_stripped) — second value matches cognitive pipeline input.
    """

    raw_clean = normalize_voice_transcript(transcript)
    stripped = normalize_pilot_utterance(raw_clean, memory)
    return raw_clean, stripped
