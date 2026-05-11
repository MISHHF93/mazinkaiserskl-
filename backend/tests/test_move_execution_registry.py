"""Move execution engine + registry smoke tests."""

from __future__ import annotations

import random

from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.domain.moves import KaiserMove
from mazinkaiser.simulation.kernel import DigitalTwinKernel
from mazinkaiser.simulation.move_execution.registry import all_moves_registered
from mazinkaiser.simulation.move_execution.registry_build import build_move_registry


def test_all_canonical_moves_registered() -> None:
    reg = build_move_registry()
    assert len(reg) == len(KaiserMove)
    assert set(reg) == set(KaiserMove)


def test_kernel_registry_integrity() -> None:
    assert DigitalTwinKernel().registry_integrity_ok()
    assert all_moves_registered()


def test_batch_refuses_high_heat_turbo() -> None:
    k = DigitalTwinKernel(rng=random.Random(7))
    k.snapshot.heat_pct = 91
    before = k.snapshot.photon_reserve_pct
    k.execute_move(KaiserMove.TURBO_SMASHER_PUNCH, PersonalityMode.KAISER_CORE_MODE)
    assert k.last_batch_report is not None
    assert k.last_batch_report["outcome"] == "refused"
    assert k.snapshot.photon_reserve_pct == before


def test_batch_accepts_rocket() -> None:
    k = DigitalTwinKernel(rng=random.Random(8))
    k.execute_move(KaiserMove.ROCKET_PUNCH, PersonalityMode.KAISER_CORE_MODE)
    assert k.last_batch_report["outcome"] == "accepted"
    assert len(k.last_batch_report["steps"]) == 14
