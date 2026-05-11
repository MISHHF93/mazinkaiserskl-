"""Narrative micro-generation without mandatory LLM (deterministic scaffolding)."""



from __future__ import annotations



from mazinkaiser.simulation.instinct.models import InstinctAssessment





def kaiser_quick_suggestion(instinct: InstinctAssessment) -> str:

    """One-line deterministic recommendation for `/command` style interactions."""



    if instinct.recommended_actions:

        return instinct.recommended_actions[0]

    return "Instinct lattice quiet — state your objective, Pilot."





def amplify_reply_tone_hint(reply: str, instinct: InstinctAssessment) -> str:

    """

    Lightweight offline adjustment when no LLM tier is configured.

    Prefix only for critical/high urgency so day-to-day chat stays untouched.

    """



    if instinct.urgency in ("critical", "high"):

        prefix = (

            "(Priority channel) "

            if instinct.urgency == "critical"

            else "(Attention) "

        )

        return prefix + reply

    return reply


