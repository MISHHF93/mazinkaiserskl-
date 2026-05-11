"""Subsystem integrations — deterministic physics-lite steps on `TwinSnapshot`."""

from __future__ import annotations

import random

from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.domain.twin_state import TwinOperationalState
from mazinkaiser.simulation.twin_derived import recompute_derived_telemetry, sync_movement_state
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot
from mazinkaiser.simulation.twin_validate import clamp_snapshot_inplace


def clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


def dissipate_cooldowns(snapshot: TwinSnapshot, dt: float) -> None:
    if not snapshot.cooldowns_remaining:
        return
    for k in list(snapshot.cooldowns_remaining.keys()):
        snapshot.cooldowns_remaining[k] = max(0.0, snapshot.cooldowns_remaining[k] - dt)
        if snapshot.cooldowns_remaining[k] <= 1e-6:
            del snapshot.cooldowns_remaining[k]


def subsystem_idle_tick(snapshot: TwinSnapshot, dt: float, rng: random.Random, mode: PersonalityMode) -> None:
    """Background regulation: reactors, coolant loops, synchro trims."""
    if snapshot.operational_state == TwinOperationalState.SHUTDOWN_SAFE:
        dissipate_cooldowns(snapshot, dt)
        recompute_derived_telemetry(snapshot)
        sync_movement_state(snapshot)
        clamp_snapshot_inplace(snapshot)
        return

    mode_heat_bonus = {
        PersonalityMode.GUARDIAN_MODE: -0.12,
        PersonalityMode.ENGINEER_MODE: -0.05,
        PersonalityMode.TACTICAL_MODE: 0.04,
        PersonalityMode.PROFESSOR_MODE: -0.02,
        PersonalityMode.PILOT_ASSIST_MODE: 0.0,
        PersonalityMode.KAISER_CORE_MODE: 0.0,
        PersonalityMode.OVERDRIVE_WARNING_MODE: 0.06,
    }.get(mode, 0.0)

    dissipate_cooldowns(snapshot, dt)

    if snapshot.operational_state == TwinOperationalState.COMBAT_SIMULATION:
        snapshot.pilot_stress_pct = clamp(
            snapshot.pilot_stress_pct
            + rng.uniform(0.06, 0.42) * dt * (1.0 + snapshot.structural_stress_pct / 200.0),
        )
    elif mode == PersonalityMode.GUARDIAN_MODE:
        snapshot.pilot_stress_pct = clamp(snapshot.pilot_stress_pct - rng.uniform(0.02, 0.14) * dt)

    target_photon = clamp(
        snapshot.photon_reserve_pct + rng.uniform(-0.35, 0.35) + (snapshot.reactor_output_pct - 72) * 0.015 * dt,
    )

    reactor_drift = rng.uniform(-0.45, 0.45) + (snapshot.sync_rate_pct - 90) * 0.008 * dt
    sync_drift = rng.uniform(-0.22, 0.22)

    coolant = (
        rng.uniform(-0.75, 0.55) + mode_heat_bonus - structural_heat_drag(snapshot.structural_stress_pct) * dt
    )

    snapshot.photon_reserve_pct = clamp(target_photon)
    snapshot.reactor_output_pct = clamp(snapshot.reactor_output_pct + reactor_drift * dt * 2.6)
    snapshot.sync_rate_pct = clamp(snapshot.sync_rate_pct + sync_drift)
    snapshot.energy_reserve_pct = clamp(
        snapshot.energy_reserve_pct + rng.uniform(-0.22, 0.18)
        + (snapshot.reactor_output_pct - snapshot.energy_reserve_pct) * 0.006 * dt,
    )
    snapshot.heat_pct = clamp(snapshot.heat_pct + coolant)

    structural_relax(snapshot, dt)
    snapshot.aux_routing_pct = clamp(snapshot.aux_routing_pct + rng.uniform(-0.08, 0.08))

    advance_demo_hud(snapshot, dt)
    recompute_derived_telemetry(snapshot)
    sync_movement_state(snapshot)
    clamp_snapshot_inplace(snapshot)


def structural_heat_drag(stress_pct: float) -> float:
    return max(0.0, stress_pct) * 0.012


def structural_relax(snapshot: TwinSnapshot, dt: float) -> None:
    snapshot.structural_stress_pct = clamp(snapshot.structural_stress_pct * (0.965**dt), 0.0, 120.0)


def advance_demo_hud(snapshot: TwinSnapshot, dt: float) -> None:
    """Cinematic move banner decays with simulation time."""
    if snapshot.demo_residual_s > 0:
        snapshot.demo_residual_s = max(0.0, snapshot.demo_residual_s - dt)
        if snapshot.demo_residual_s <= 0 and snapshot.tactical_band.startswith("DEMO_ACTIVE"):
            snapshot.tactical_band = "CLEAR"


def apply_structural_shock(snapshot: TwinSnapshot, impulse: float) -> None:
    snapshot.structural_stress_pct = clamp(snapshot.structural_stress_pct + impulse, 0.0, 120.0)
