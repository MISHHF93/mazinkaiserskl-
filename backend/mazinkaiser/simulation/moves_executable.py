"""Shim retained for callers expecting `simulate_move_execution` (bypasses full batch pipeline)."""

from __future__ import annotations

import random

from mazinkaiser.domain.moves import KaiserMove
from mazinkaiser.simulation.move_execution.registry import get_move_definition
from mazinkaiser.simulation.move_execution.telemetry_apply import apply_telemetry_mutation
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot


def simulate_move_execution(
    move: KaiserMove,
    snapshot: TwinSnapshot,
    rng: random.Random,
) -> dict[str, float | str | int]:
    """Legacy direct telemetry stomp — prefer `MoveExecutionEngine` via kernel."""

    definition = get_move_definition(move)
    cd_left = snapshot.cooldowns_remaining.get(move.value, 0.0)
    spec = definition.telemetry
    repeat_penalty = (
        1.0
        if cd_left <= 1e-3
        else max(
            0.52,
            1.0 - min(0.6, cd_left / max(35.0, spec.cooldown_seconds)),
        )
    )

    metrics = apply_telemetry_mutation(definition, snapshot, rng, repeat_penalty=repeat_penalty)

    return {
        "move": move.value,
        "cooldown_registered_s": metrics["cooldown_registered_s"],
        "repeat_penalty": metrics["repeat_penalty"],
    }
