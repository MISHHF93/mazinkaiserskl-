"""Cinematic scale profile for the digital twin (presence over raw databook spread).

Sources differ (OVA ~23–25 m, SRW ~28 m, etc.); this project uses a unified **cinematic**
profile so simulation, HUD copy, and future physics feel like a city-dominating super robot.

**Mass / weight** are not arbitrary: they follow ``mazinkaiser.domain.mecha_physics`` —
cylinder hull envelope × structural solid fraction × effective alloy density → **kg**,
**metric tons**, and **Newtons** (standard gravity).
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, computed_field

from mazinkaiser.domain.mecha_physics import (
    CYLINDER_HEIGHT_FRACTION_OF_OVERALL_HEIGHT,
    CYLINDER_RADIUS_FRACTION_OF_SHOULDER_WIDTH,
    GRAVITY_MS2,
    hull_cylinder_envelope_volume_m3,
    operating_mass_kg,
    weight_newtons,
)

PHILOSOPHY = (
    "Cinematic scale: overwhelmingly massive, reactor-heavy armor and city-dominating "
    "presence — not strict OVA/SRW databook numbers. Use for twin presentation, "
    "environment framing, cockpit scale, and future inertia / shockwave models."
)


class MazinkaiserCinematicScaleProfile(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    height_meters: float = Field(default=32.0, gt=0, description="Simulation height (cinematic presence).")
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

    @computed_field  # type: ignore[prop-decorator]
    @property
    def hull_envelope_radius_m(self) -> float:
        """Cylinder radius = ``CYLINDER_RADIUS_FRACTION_OF_SHOULDER_WIDTH × shoulder_width_m``."""

        return CYLINDER_RADIUS_FRACTION_OF_SHOULDER_WIDTH * self.shoulder_width_meters

    @computed_field  # type: ignore[prop-decorator]
    @property
    def hull_envelope_stack_height_m(self) -> float:
        """Cylinder stack height = ``CYLINDER_HEIGHT_FRACTION_OF_OVERALL_HEIGHT × height_m``."""

        return CYLINDER_HEIGHT_FRACTION_OF_OVERALL_HEIGHT * self.height_meters

    @computed_field  # type: ignore[prop-decorator]
    @property
    def hull_envelope_volume_m3(self) -> float:
        return hull_cylinder_envelope_volume_m3(
            height_m=self.height_meters,
            shoulder_width_m=self.shoulder_width_meters,
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def mass_kg(self) -> float:
        return operating_mass_kg(height_m=self.height_meters, shoulder_width_m=self.shoulder_width_meters)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def weight_metric_tons(self) -> float:
        """1 t = 1000 kg (SI)."""

        return round(self.mass_kg / 1000.0, 3)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def weight_newtons(self) -> float:
        """Earth weight ``m g`` with ``g = GRAVITY_MS2``."""

        return round(weight_newtons(mass_kg=self.mass_kg), 2)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def gravity_ms2(self) -> float:
        return GRAVITY_MS2


MAZINKAISER_CINEMATIC_SCALE_PROFILE = MazinkaiserCinematicScaleProfile()


def cinematic_scale_public_dict() -> dict[str, Any]:
    """JSON-ready payload for cockpit REST and WebSocket `welcome`."""
    return MAZINKAISER_CINEMATIC_SCALE_PROFILE.model_dump(mode="json")
