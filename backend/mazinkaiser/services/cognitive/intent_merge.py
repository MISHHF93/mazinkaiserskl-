"""Combine model-reported intent with rule-based intent (move safety)."""

from __future__ import annotations

from mazinkaiser.services.cognitive.command_parser import ParsedCommand
from mazinkaiser.services.cognitive.intent import PilotIntent


def coerce_pilot_intent(raw: object | None) -> PilotIntent:
    if raw is None:
        return PilotIntent.UNKNOWN
    s = str(raw).strip()
    if not s:
        return PilotIntent.UNKNOWN
    try:
        return PilotIntent(s)
    except ValueError:
        return PilotIntent.UNKNOWN


def merged_intent_for_operations(
    *,
    structured_intent_raw: str | None,
    heuristic_intent: PilotIntent,
    parsed: ParsedCommand,
) -> PilotIntent:
    uh = coerce_pilot_intent(structured_intent_raw)
    if uh == PilotIntent.MOVE_REQUEST:
        return PilotIntent.MOVE_REQUEST
    if heuristic_intent == PilotIntent.MOVE_REQUEST and parsed.confidence >= 0.5:
        return PilotIntent.MOVE_REQUEST
    if uh != PilotIntent.UNKNOWN:
        return uh
    return heuristic_intent
