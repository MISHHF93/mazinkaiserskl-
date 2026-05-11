"""Lightweight tactical simulation for HUD — fictional battlefield only."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any


@dataclass
class TacticalSnapshot:
    threats_ranked: list[dict[str, Any]]
    recommended_defense: str
    environment: str
    prediction: str


class TacticalSimulationService:
    """Deterministic-ish snapshot for MVP; plug in richer models later."""

    def __init__(self) -> None:
        self._rng = random.Random()

    def snapshot(self) -> TacticalSnapshot:
        envs = ["Urban perimeter", "Coastal approach", "Mountain pass", "Desert basin"]
        env = self._rng.choice(envs)
        threats = [
            {"id": "T1", "class": "simulated_hostile_drone", "priority": 0.72},
            {"id": "T2", "class": "simulated_artillery_grid", "priority": 0.55},
            {"id": "T3", "class": "simulated_infantry_cluster", "priority": 0.41},
        ]
        threats.sort(key=lambda x: x["priority"], reverse=True)
        return TacticalSnapshot(
            threats_ranked=threats,
            recommended_defense=(
                "Simulated priority: electronic countermeasures and point defense envelope. "
                "All effects are notional training data."
            ),
            environment=env,
            prediction=(
                "Notional ETA for nearest simulated threat vector: "
                f"{4 + self._rng.randint(0, 8)} minutes (fictional)."
            ),
        )
