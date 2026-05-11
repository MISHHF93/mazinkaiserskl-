from enum import StrEnum


class MoveFamily(StrEnum):
    """Drives telemetry interpretation + tactical advisor weighting."""

    STRIKE_MELEE = "strike_melee"
    STRIKE_RANGED = "strike_ranged"
    BEAM_CORE = "beam_core"
    AREA_STORM = "area_storm"
    ULTIMATE = "ultimate"
    BOOMERANG = "boomerang"
    DEFENSIVE_FIELD = "defensive_field"
