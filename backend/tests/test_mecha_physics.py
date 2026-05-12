"""Hull envelope → operating mass (cinematic twin, not GLB FEM)."""

from __future__ import annotations

import math

import pytest

from mazinkaiser.domain.mecha_physics import (
    EFFECTIVE_ALLOY_DENSITY_KG_M3,
    GRAVITY_MS2,
    STRUCTURAL_EQUIVALENT_SOLID_FRACTION,
    hull_cylinder_envelope_volume_m3,
    operating_mass_kg,
    weight_newtons,
)


def test_hull_volume_matches_closed_form() -> None:
    h, w = 32.0, 14.0
    v = hull_cylinder_envelope_volume_m3(height_m=h, shoulder_width_m=w)
    r = 0.40 * w
    cyl_h = 0.64 * h
    assert v == pytest.approx(math.pi * r * r * cyl_h, rel=1e-12)


def test_operating_mass_scales_with_volume_constants() -> None:
    m = operating_mass_kg(height_m=32.0, shoulder_width_m=14.0)
    v = hull_cylinder_envelope_volume_m3(height_m=32.0, shoulder_width_m=14.0)
    assert m == pytest.approx(v * STRUCTURAL_EQUIVALENT_SOLID_FRACTION * EFFECTIVE_ALLOY_DENSITY_KG_M3)


def test_weight_newtons_is_mg() -> None:
    m = 1000.0
    assert weight_newtons(mass_kg=m) == pytest.approx(m * GRAVITY_MS2)
