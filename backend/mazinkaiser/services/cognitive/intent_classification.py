"""Classify pilot intent from normalized text + optional parse hints."""



from __future__ import annotations



from mazinkaiser.services.cognitive.command_parser import ParsedCommand

from mazinkaiser.services.cognitive.intent import PilotIntent





def classify_intent(normalized_text: str, parsed: ParsedCommand) -> PilotIntent:

    """Rule-based classification — upgrade with an LLM or small model later."""



    if parsed.verb == "EMPTY":

        return PilotIntent.UNKNOWN



    verb_map: dict[str, PilotIntent] = {

        "DIAG": PilotIntent.DIAGNOSTICS,

        "DIAGNOSTICS": PilotIntent.DIAGNOSTICS,

        "MOVE": PilotIntent.MOVE_REQUEST,

        "DIRECTIVE": PilotIntent.DIRECTIVE_REQUEST,

        "MODE": PilotIntent.MODE_CHANGE,

        "TACTICAL": PilotIntent.TACTICAL_INQUIRY,

        "STATUS": PilotIntent.STATUS_CHECK,

    }

    if parsed.verb in verb_map and parsed.confidence >= 0.5:

        return verb_map[parsed.verb]



    lower = normalized_text.lower()

    if any(w in lower for w in ("unsafe", "illegal", "why did you refuse", "harm")):

        return PilotIntent.SAFETY_OR_REFUSAL_CONTEXT



    if parsed.verb == "CHAT" and len(normalized_text.split()) <= 2:

        return PilotIntent.GENERAL_DIALOGUE



    return PilotIntent.GENERAL_DIALOGUE


