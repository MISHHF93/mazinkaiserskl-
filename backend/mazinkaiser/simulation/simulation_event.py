"""Discrete simulation timeline events (replay / telemetry / audits)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any


class TwinEventKind(StrEnum):
    TICK = "tick"
    MOVE_SIMULATED = "move_simulated"
    MOVE_BATCH = "move_batch"
    DIAGNOSTICS = "diagnostics"
    DIRECTIVE = "directive"
    OVERDRIVE_TRANSITION = "overdrive_transition"
    STATE_INPUT = "state_input"
    PILDER_PILOT = "pilder_pilot"


@dataclass
class TwinEvent:
    seq: int
    kind: TwinEventKind
    clock_s: float
    summary: str
    payload: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


def serialize_twin_event(ev: TwinEvent) -> dict[str, Any]:
    return {
        "seq": ev.seq,
        "kind": ev.kind.value,
        "clock_s": ev.clock_s,
        "summary": ev.summary,
        "payload": ev.payload,
        "created_at": ev.created_at.isoformat(),
    }
