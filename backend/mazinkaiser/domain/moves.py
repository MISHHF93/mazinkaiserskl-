"""Canonical move catalogue — cinematic / simulated demonstrations only."""

from __future__ import annotations

from enum import StrEnum


class KaiserMove(StrEnum):
    ROCKET_PUNCH = "Rocket Punch"
    TURBO_SMASHER_PUNCH = "Turbo Smasher Punch"
    RUST_TORNADO = "Rust Tornado"
    FIRE_BLASTER = "Fire Blaster"
    KOSHIRYOKU_BEAM = "Koshiryoku Beam"
    KAISER_BLADE = "Kaiser Blade"
    FINAL_KAISER_BLADE = "Final Kaiser Blade"
    KAISER_NOVA = "Kaiser Nova"
    SCRANDER_BOOMERANG = "Scrander Boomerang"
    SHOULDER_SLICER = "Shoulder Slicer"
    GLACIAL_BEAM = "Glacial Beam / Reito Beam"
    GIGANTO_MISSILE = "Giganto Missile"
    DYNAMITE_TACKLE = "Dynamite Tackle"
    KAISER_KNUCKLE = "Kaiser Knuckle"
    MAZIN_FIELD_SIMULATION = "Mazin Field Simulation"


MOVE_METADATA: dict[KaiserMove, dict[str, str]] = {
    KaiserMove.ROCKET_PUNCH: {"class": "ranged", "energy": "medium"},
    KaiserMove.TURBO_SMASHER_PUNCH: {"class": "melee", "energy": "high"},
    KaiserMove.RUST_TORNADO: {"class": "area", "energy": "high"},
    KaiserMove.FIRE_BLASTER: {"class": "ranged", "energy": "medium"},
    KaiserMove.KOSHIRYOKU_BEAM: {"class": "beam", "energy": "very_high"},
    KaiserMove.KAISER_BLADE: {"class": "melee", "energy": "high"},
    KaiserMove.FINAL_KAISER_BLADE: {"class": "melee", "energy": "extreme"},
    KaiserMove.KAISER_NOVA: {"class": "ultimate", "energy": "maximum"},
    KaiserMove.SCRANDER_BOOMERANG: {"class": "ranged", "energy": "high"},
    KaiserMove.SHOULDER_SLICER: {"class": "melee", "energy": "high"},
    KaiserMove.GLACIAL_BEAM: {"class": "beam", "energy": "high", "aliases": "Reito Beam"},
    KaiserMove.GIGANTO_MISSILE: {"class": "ordnance", "energy": "very_high"},
    KaiserMove.DYNAMITE_TACKLE: {"class": "melee", "energy": "high"},
    KaiserMove.KAISER_KNUCKLE: {"class": "melee", "energy": "medium"},
    KaiserMove.MAZIN_FIELD_SIMULATION: {"class": "defensive", "energy": "sustained"},
}


def kaiser_move_slug(move: KaiserMove) -> str:
    """URL-safe kebab id (stable for APIs and OpenAPI path params)."""

    return (
        move.value.lower()
        .replace(" / ", "-")
        .replace("/", "-")
        .replace(" ", "-")
    )


_SLUG_ALIASES: dict[str, KaiserMove] = {
    "reito-beam": KaiserMove.GLACIAL_BEAM,
    "glacial-beam": KaiserMove.GLACIAL_BEAM,
}


def _norm_ident(s: str) -> str:
    return "".join(s.lower().split())


def kaiser_move_from_slug_or_raise(identifier: str) -> KaiserMove:
    """Resolve kebab slug, optional alias, or canonical display name (case-insensitive)."""

    raw = identifier.strip()
    if not raw:
        msg = "Empty move identifier"
        raise ValueError(msg)
    key = raw.lower().replace("_", "-")
    if key in _SLUG_ALIASES:
        return _SLUG_ALIASES[key]
    for m in KaiserMove:
        if kaiser_move_slug(m) == key:
            return m
    nk = _norm_ident(raw)
    for m in KaiserMove:
        if _norm_ident(m.value) == nk:
            return m
    msg = f"Unknown Mazinkaiser move: {identifier!r}"
    raise ValueError(msg)
