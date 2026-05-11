"""Unit tests for wake-prefix normalization."""

from mazinkaiser.services.command_preprocess import normalize_pilot_utterance
from mazinkaiser.services.memory.session import SessionMemory


def test_strip_prefix() -> None:
    mem = SessionMemory()
    mem.wake_strip_enabled = True
    mem.wake_prefixes = ["Kaiser,"]
    assert normalize_pilot_utterance("Kaiser, run diagnostics", mem) == "run diagnostics"


def test_no_strip_when_disabled() -> None:
    mem = SessionMemory()
    mem.wake_strip_enabled = False
    assert normalize_pilot_utterance("Kaiser, hold", mem) == "Kaiser, hold"


def test_longest_prefix_wins() -> None:
    mem = SessionMemory()
    mem.wake_prefixes = ["Hey Kaiser,", "Hey Kaiser, please"]
    assert (
        normalize_pilot_utterance("Hey Kaiser, please fire blaster", mem) == "fire blaster"
    )
