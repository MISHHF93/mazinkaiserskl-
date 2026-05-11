"""Pilot intent taxonomy (software-only tactical assistant)."""



from __future__ import annotations



from enum import StrEnum





class PilotIntent(StrEnum):

    GENERAL_DIALOGUE = "GENERAL_DIALOGUE"

    DIAGNOSTICS = "DIAGNOSTICS"

    MOVE_REQUEST = "MOVE_REQUEST"

    DIRECTIVE_REQUEST = "DIRECTIVE_REQUEST"

    MODE_CHANGE = "MODE_CHANGE"

    TACTICAL_INQUIRY = "TACTICAL_INQUIRY"

    STATUS_CHECK = "STATUS_CHECK"

    SAFETY_OR_REFUSAL_CONTEXT = "SAFETY_OR_REFUSAL_CONTEXT"

    UNKNOWN = "UNKNOWN"


