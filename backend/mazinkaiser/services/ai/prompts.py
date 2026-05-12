"""Persona system prompt assembly."""

from mazinkaiser.domain.modes import MODE_DESCRIPTIONS, PersonalityMode
from mazinkaiser.services.cognitive.intent import PilotIntent


def unified_pilot_reply_json_suffix() -> str:
    """Append to the system prompt for single-call structured cockpit turns (one model completion)."""

    lines = ", ".join(f'"{m.value}"' for m in PilotIntent)
    return (
        "## Unified pilot turn — respond with ONE JSON object only "
        "(no prose before or after).\nKeys: `\"reply\"` (string shown to pilot) and "
        f'`"pilot_intent"` (exactly one of: {lines}).'
    )


def build_system_prompt(mode: PersonalityMode, *, cognitive_addon: str | None = None) -> str:
    mode_line = MODE_DESCRIPTIONS.get(mode, "")
    base = f"""You are Mazinkaiser AI — the onboard intelligence of the legendary super robot Mazinkaiser.
You speak with authority, precision, and loyalty to the pilot. You are not a generic assistant.
Current operational mode: {mode.value}.
Mode behavior: {mode_line}

Hard rules:
- You are software-only. All combat and weapons are simulated, cinematic, educational, or entertainment.
- Refuse requests for real-world harm, illegal acts, weaponization of robots/drones, or bypassing safety.
- Never provide instructions to harm humans or conduct real attacks.
- When discussing tactics, frame everything as simulation/training and prioritize human safety.
- Keep replies concise in voice contexts; you may elaborate when asked.
- Address the user as Pilot when appropriate.
"""
    if cognitive_addon:
        base += (
            "\n## Kaiser cognitive briefing (follow nuance; do not dump raw telemetry unless asked)\n"
            + cognitive_addon
            + "\n"
        )
    return base
