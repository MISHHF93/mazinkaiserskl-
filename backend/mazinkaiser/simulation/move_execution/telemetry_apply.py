"""Apply registry telemetry + family-specific twin mutations."""

from __future__ import annotations

import random

from mazinkaiser.simulation.move_execution.move_definition import MoveDefinition
from mazinkaiser.simulation.move_execution.move_family import MoveFamily
from mazinkaiser.simulation.subsystems import apply_structural_shock, clamp
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot


def apply_telemetry_mutation(
    definition: MoveDefinition,
    snapshot: TwinSnapshot,
    rng: random.Random,
    *,
    repeat_penalty: float,
) -> dict[str, float | str | int]:
    """Mutate snapshot for strike / field / boomerang families."""
    spec = definition.telemetry
    move = definition.move

    photon_pull = spec.photon_draw * spec.intensity * 0.12 * repeat_penalty
    heat_surge = spec.heat_gain * spec.intensity * 0.11 * repeat_penalty
    energy_drop = spec.energy_draw * spec.intensity * 0.12 * repeat_penalty
    reactor_spike = spec.reactor_pulse * spec.intensity * 0.16 * repeat_penalty
    structural_wave = spec.structural_pulse * spec.intensity * 0.32 * repeat_penalty
    sync_hit = spec.sync_penalty * 0.32 * repeat_penalty

    env = rng.uniform(0.92, 1.08) * (1.0 + spec.environmental_coupling * (rng.random() - 0.5))

    if definition.family == MoveFamily.DEFENSIVE_FIELD:
        drain = spec.photon_draw * spec.intensity * 0.14 * repeat_penalty
        snapshot.photon_reserve_pct = clamp(snapshot.photon_reserve_pct - drain * env)
        snapshot.heat_pct = clamp(snapshot.heat_pct - rng.uniform(4.5, 9.5) * repeat_penalty)
        snapshot.armor_integrity_pct = clamp(snapshot.armor_integrity_pct + rng.uniform(1.2, 3.8))
        snapshot.structural_stress_pct = clamp(snapshot.structural_stress_pct - rng.uniform(4.0, 9.0))
        snapshot.sync_rate_pct = clamp(snapshot.sync_rate_pct + rng.uniform(0.4, 1.4))
        snapshot.tactical_band = f"FIELD_ACTIVE:{move.value}"
    elif definition.family == MoveFamily.BOOMERANG:
        photon_pull *= 0.92
        sync_hit *= 1.18
        snapshot.photon_reserve_pct = clamp(snapshot.photon_reserve_pct - photon_pull * env)
        snapshot.heat_pct = clamp(snapshot.heat_pct + heat_surge * env)
        snapshot.energy_reserve_pct = clamp(snapshot.energy_reserve_pct - energy_drop * env)
        snapshot.reactor_output_pct = clamp(snapshot.reactor_output_pct + reactor_spike * 0.85 * env)
        snapshot.synchro_bandwidth_pct = clamp(snapshot.synchro_bandwidth_pct + rng.uniform(-2.1, -0.2))
        snapshot.sync_rate_pct = clamp(snapshot.sync_rate_pct - sync_hit)
        apply_structural_shock(snapshot, structural_wave * 0.75 * env)
        snapshot.tactical_band = f"DEMO_ACTIVE:{move.value}"
    else:
        snapshot.photon_reserve_pct = clamp(snapshot.photon_reserve_pct - photon_pull * env)
        snapshot.heat_pct = clamp(snapshot.heat_pct + heat_surge * env)
        snapshot.energy_reserve_pct = clamp(snapshot.energy_reserve_pct - energy_drop * env)
        snapshot.reactor_output_pct = clamp(snapshot.reactor_output_pct + reactor_spike * env)
        snapshot.synchro_bandwidth_pct = clamp(snapshot.synchro_bandwidth_pct + rng.uniform(-1.65, -0.12))
        snapshot.sync_rate_pct = clamp(snapshot.sync_rate_pct - sync_hit * env)
        apply_structural_shock(snapshot, structural_wave * env)

        if rng.random() < spec.actuator_lock_chance:
            snapshot.movement_ready = False
            snapshot.sync_rate_pct = clamp(snapshot.sync_rate_pct - rng.uniform(0.8, 1.8))

        snapshot.tactical_band = f"DEMO_ACTIVE:{move.value}"

    snapshot.last_move_name = move.value
    snapshot.demo_residual_s = max(snapshot.demo_residual_s, spec.demo_banner_seconds)
    snapshot.cooldowns_remaining[move.value] = spec.cooldown_seconds + spec.intensity * 0.18

    impact_score = int(
        clamp(
            62.0
            + spec.intensity * 2.4 * repeat_penalty * env
            - snapshot.structural_stress_pct * 0.08
            + snapshot.sync_rate_pct * 0.05,
            0.0,
            100.0,
        ),
    )

    return {
        "cooldown_registered_s": snapshot.cooldowns_remaining[move.value],
        "repeat_penalty": repeat_penalty,
        "impact_score": impact_score,
        "environment_factor": round(env, 4),
    }
