"""Resolve pilot utterances to a canonical KaiserMove (slash MOVE and NL heuristic)."""

from __future__ import annotations

from mazinkaiser.domain.moves import KaiserMove, kaiser_move_from_slug_or_raise
from mazinkaiser.services.cognitive.command_parser import ParsedCommand

_MOVE_SLASH_CONFIDENCE = 0.92
_MOVE_NL_MIN_CONFIDENCE = 0.62


def pilot_authorized_for_resolved_move(parsed: ParsedCommand) -> bool:
    """When resolution succeeds after heuristics, gate execution on parsed confidence."""

    return parsed.confidence >= _MOVE_NL_MIN_CONFIDENCE


def resolve_kaiser_move_from_pilot_input(normalized_text: str, parsed: ParsedCommand) -> KaiserMove | None:
    nt = normalized_text.strip().lower()
    if parsed.verb != "MOVE":
        return None

    slash_explicit = parsed.confidence >= _MOVE_SLASH_CONFIDENCE
    gated = slash_explicit or parsed.confidence >= _MOVE_NL_MIN_CONFIDENCE

    if parsed.tokens:
        hyphen = "-".join(t.strip().lower() for t in parsed.tokens if t.strip())
        if hyphen:
            try:
                m = kaiser_move_from_slug_or_raise(hyphen)
                if gated:
                    return m
            except ValueError:
                pass
        joined_space = " ".join(t.strip() for t in parsed.tokens if t.strip())
        if joined_space:
            try:
                m = kaiser_move_from_slug_or_raise(joined_space)
                if gated:
                    return m
            except ValueError:
                pass

    candidates = [m for m in KaiserMove if m.value.lower() in nt]
    if not candidates:
        return None

    maxlen = max(len(m.value) for m in candidates)
    winners = [m for m in candidates if len(m.value) == maxlen]
    if len(winners) != 1:
        return None

    if not gated:
        return None
    return winners[0]
