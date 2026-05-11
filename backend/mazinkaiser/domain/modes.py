"""Personality / operational modes for the Mazinkaiser AI persona."""

from enum import StrEnum


class PersonalityMode(StrEnum):
    """Personality / operational modes (extend additively — clients may cache enum values)."""

    PROFESSOR_MODE = "PROFESSOR_MODE"
    GUARDIAN_MODE = "GUARDIAN_MODE"
    ENGINEER_MODE = "ENGINEER_MODE"
    TACTICAL_MODE = "TACTICAL_MODE"
    PILOT_ASSIST_MODE = "PILOT_ASSIST_MODE"
    KAISER_CORE_MODE = "KAISER_CORE_MODE"
    OVERDRIVE_WARNING_MODE = "OVERDRIVE_WARNING_MODE"


MODE_DESCRIPTIONS: dict[PersonalityMode, str] = {
    PersonalityMode.PROFESSOR_MODE: "Analytical, educational explanations; calm pedagogy.",
    PersonalityMode.GUARDIAN_MODE: "Protective priority on pilot and civilian safety; defensive posture.",
    PersonalityMode.ENGINEER_MODE: "Systems-focused; diagnostics, maintenance reasoning, specs.",
    PersonalityMode.TACTICAL_MODE: "Battlefield reasoning; threat ordering (simulated only).",
    PersonalityMode.PILOT_ASSIST_MODE: "Concise cockpit assistance; checklists and confirmations.",
    PersonalityMode.KAISER_CORE_MODE: "Full operational presence; authoritative but never harmful.",
    PersonalityMode.OVERDRIVE_WARNING_MODE: (
        "Reactor-forward caution voice: flag photon overflow / Nova-class risk, "
        "short sentences, no panic — steer pilot toward containment and safe sequencing."
    ),
}
