"""SI mass / weight derivations for the cinematic twin (hull envelope → operating mass).

The GLB is a void-dominated shell; we model an equivalent **solid fraction** of a simple
cylinder envelope (torso + leg stack) filled with a notional armor / frame alloy density.
This yields consistent **kg**, **metric tons**, and **Newtons** for HUD, LLM briefing, and
future inertia hooks — not a FEM mass property of the mesh.
"""

from __future__ import annotations

import math

# Standard gravity (SI).
GRAVITY_MS2: float = 9.80665

# Cylinder standing inside the shoulder line and below the crown (void + limbs outside).
CYLINDER_RADIUS_FRACTION_OF_SHOULDER_WIDTH: float = 0.40
CYLINDER_HEIGHT_FRACTION_OF_OVERALL_HEIGHT: float = 0.64

# Fe–Ni armor lattice + frame + reactor ballast as a single equivalent alloy (kg m⁻³).
EFFECTIVE_ALLOY_DENSITY_KG_M3: float = 7245.0

# ~98% cavities (cockpit bays, actuator voids, photon plumbing) — typical for fictional super robots.
STRUCTURAL_EQUIVALENT_SOLID_FRACTION: float = 0.01915


def hull_cylinder_envelope_volume_m3(*, height_m: float, shoulder_width_m: float) -> float:
    """Right circular cylinder volume using documented fractions of overall height / shoulder span."""

    r = CYLINDER_RADIUS_FRACTION_OF_SHOULDER_WIDTH * shoulder_width_m
    h = CYLINDER_HEIGHT_FRACTION_OF_OVERALL_HEIGHT * height_m
    return math.pi * r * r * h


def operating_mass_kg(*, height_m: float, shoulder_width_m: float) -> float:
    """``ρ × V × f`` — operating mass tied to published cinematic height / shoulder span."""

    vol = hull_cylinder_envelope_volume_m3(height_m=height_m, shoulder_width_m=shoulder_width_m)
    return vol * STRUCTURAL_EQUIVALENT_SOLID_FRACTION * EFFECTIVE_ALLOY_DENSITY_KG_M3


def weight_newtons(*, mass_kg: float) -> float:
    return mass_kg * GRAVITY_MS2
