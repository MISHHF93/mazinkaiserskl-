"""Kaiser Core cognitive pipeline exports."""

from mazinkaiser.services.cognitive.command_parser import ParsedCommand, parse_pilot_command
from mazinkaiser.services.cognitive.intent import PilotIntent
from mazinkaiser.services.cognitive.intent_classification import classify_intent
from mazinkaiser.services.cognitive.pilot_profile import PilotIdentity, pilot_from_memory
from mazinkaiser.services.cognitive.pipeline import CognitiveTurnBundle, build_cognitive_turn_bundle
from mazinkaiser.services.cognitive.response_generation import (
    amplify_reply_tone_hint,
    kaiser_quick_suggestion,
)
from mazinkaiser.services.cognitive.session_context import build_session_context_dict
from mazinkaiser.services.cognitive.tactical_reasoning import tactical_summary_lines
from mazinkaiser.services.cognitive.turn_bridge import (
    build_instinct_status,
    execute_cognitive_chat_turn,
    mecha_compact,
    resolve_stored_intent,
)

__all__ = [
    "PilotIntent",
    "ParsedCommand",
    "parse_pilot_command",
    "classify_intent",
    "PilotIdentity",
    "pilot_from_memory",
    "build_session_context_dict",
    "tactical_summary_lines",
    "CognitiveTurnBundle",
    "build_cognitive_turn_bundle",
    "execute_cognitive_chat_turn",
    "build_instinct_status",
    "mecha_compact",
    "resolve_stored_intent",
    "kaiser_quick_suggestion",
    "amplify_reply_tone_hint",
]
