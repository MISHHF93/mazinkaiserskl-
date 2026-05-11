"""Digital twin kernel correctness and determinism."""

from __future__ import annotations

import random

from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.domain.moves import KaiserMove
from mazinkaiser.services.state_engine import CockpitSession
from mazinkaiser.simulation.directives import SimulationDirective
from mazinkaiser.simulation.kernel import DigitalTwinKernel


def test_deterministic_move_with_seeded_rng() -> None:
    r1 = random.Random(42)
    r2 = random.Random(42)
    k1 = DigitalTwinKernel(rng=r1)
    k2 = DigitalTwinKernel(rng=r2)
    s1 = k1.execute_move(KaiserMove.ROCKET_PUNCH, PersonalityMode.KAISER_CORE_MODE).model_dump_json_safe()
    s2 = k2.execute_move(KaiserMove.ROCKET_PUNCH, PersonalityMode.KAISER_CORE_MODE).model_dump_json_safe()
    for blob in (s1, s2):
        blob.pop("updated_at", None)
    assert s1 == s2


def test_events_recorded_on_move() -> None:
    k = DigitalTwinKernel(rng=random.Random(0))
    k.execute_move(KaiserMove.KOSHIRYOKU_BEAM, PersonalityMode.TACTICAL_MODE)
    events = k.latest_events(10)
    assert len(events) >= 1
    assert events[-1]["kind"] == "move_simulated"


def test_cockpit_directive_updates_projection() -> None:
    rng = random.Random(2)
    sess = CockpitSession(rng=rng)
    before = sess.state.heat_level_pct
    sess.apply_directive(SimulationDirective.THERMAL_EMERGENCY_FLUSH)
    assert sess.state.heat_level_pct <= before + 1e-6


def test_demo_banner_decays_after_ticks() -> None:
    rng = random.Random(3)
    k = DigitalTwinKernel(rng=rng)
    k.execute_move(KaiserMove.ROCKET_PUNCH, PersonalityMode.KAISER_CORE_MODE)
    assert k.snapshot.demo_residual_s > 0
    for _ in range(400):
        k.step(1.5, PersonalityMode.KAISER_CORE_MODE)
    assert k.snapshot.demo_residual_s == 0.0
