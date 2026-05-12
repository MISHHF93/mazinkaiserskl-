"""Structured single-model turn parsing and intent merge."""

from __future__ import annotations

from mazinkaiser.services.cognitive.command_parser import parse_pilot_command
from mazinkaiser.services.cognitive.intent import PilotIntent
from mazinkaiser.services.cognitive.intent_classification import classify_intent
from mazinkaiser.services.cognitive.intent_merge import merged_intent_for_operations
from mazinkaiser.services.inference.hub import UnifiedInferenceHub


def test_parse_structured_pilot_turn_plain_json() -> None:
    raw = '{"reply": "Rocket sequence acknowledged.", "pilot_intent": "MOVE_REQUEST"}'
    reply, pint, err = UnifiedInferenceHub.parse_structured_pilot_turn(raw)
    assert err is None
    assert pint == "MOVE_REQUEST"
    assert "acknowledged" in reply


def test_parse_structured_pilot_turn_fenced() -> None:
    raw = '```json\n{"reply":"Ok pilot","pilot_intent":"GENERAL_DIALOGUE"}\n```'
    reply, pint, err = UnifiedInferenceHub.parse_structured_pilot_turn(raw)
    assert err is None
    assert pint == "GENERAL_DIALOGUE"
    assert reply == "Ok pilot"


def test_merge_keeps_heuristic_move_when_model_unknown() -> None:
    nt = "fire rocket punch"
    parsed = parse_pilot_command(nt)
    h = classify_intent(nt, parsed)
    merged = merged_intent_for_operations(
        structured_intent_raw=None,
        heuristic_intent=h,
        parsed=parsed,
    )
    assert merged == PilotIntent.MOVE_REQUEST


def test_merge_prefers_explicit_model_move_over_heuristic_chat() -> None:
    nt = "how is morale"
    parsed = parse_pilot_command(nt)
    h = classify_intent(nt, parsed)
    merged = merged_intent_for_operations(
        structured_intent_raw="MOVE_REQUEST",
        heuristic_intent=h,
        parsed=parsed,
    )
    assert merged == PilotIntent.MOVE_REQUEST
