"""Cinematic scale profile for the digital twin (presence over raw databook spread).

Sources differ (OVA ~23–25 m, SRW ~28 m, etc.); this project uses a unified **cinematic**
profile so simulation, HUD copy, and future physics feel like a city-dominating super robot.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

PHILOSOPHY = (
    "Cinematic scale: overwhelmingly massive, reactor-heavy armor and city-dominating "
    "presence — not strict OVA/SRW databook numbers. Use for twin presentation, "
    "environment framing, cockpit scale, and future inertia / shockwave models."
)


class MazinkaiserCinematicScaleProfile(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    height_meters: float = Field(default=32.0, gt=0, description="Simulation height (cinematic presence).")
    weight_metric_tons: float = Field(
        default=280.0,
        gt=0,
        description="Cinematic mass analogue (metric tons); dense armor + reactor.",
    )
    shoulder_width_meters: float = Field(default=14.0, gt=0)
    chest_width_meters: float = Field(default=10.0, gt=0)
    arm_length_meters: float = Field(default=13.0, gt=0)
    leg_length_meters: float = Field(default=16.0, gt=0)
    foot_length_meters: float = Field(default=6.5, gt=0)
    head_height_meters: float = Field(default=4.5, gt=0)
    kaiser_blade_length_meters: float = Field(default=22.0, gt=0)
    scrander_wingspan_meters: float = Field(default=52.0, gt=0)
    cockpit_length_meters: float = Field(default=4.2, gt=0)
    movement_profile: str = Field(default="Heavy Super Robot")
    reactor_class: str = Field(default="Catastrophic Photon Reactor")
    design_philosophy: str = Field(default=PHILOSOPHY)


MAZINKAISER_CINEMATIC_SCALE_PROFILE = MazinkaiserCinematicScaleProfile()


def cinematic_scale_public_dict() -> dict[str, Any]:
    """JSON-ready payload for cockpit REST and WebSocket `welcome`."""
    return MAZINKAISER_CINEMATIC_SCALE_PROFILE.model_dump(mode="json")
