"""Tests for simulated state engine."""

from mazinkaiser.domain.moves import KaiserMove
from mazinkaiser.services.state_engine import StateEngine


def test_session_persistence() -> None:
    eng = StateEngine()
    a = eng.get_or_create(None)
    b = eng.get_or_create(a.session_id)
    assert a.session_id == b.session_id


def test_move_demo_updates_state() -> None:
    eng = StateEngine()
    s = eng.get_or_create(None)
    before = s.state.heat_level_pct
    s.trigger_move_demo(KaiserMove.ROCKET_PUNCH)
    assert s.state.last_demo_move == KaiserMove.ROCKET_PUNCH.value
    assert s.state.heat_level_pct >= before
