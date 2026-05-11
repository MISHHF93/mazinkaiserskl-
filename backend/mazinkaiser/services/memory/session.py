"""Session-scoped memory (upgrade to vector DB + Postgres later)."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

_PREVIEW = 240
_MAX_PREF_KEYS = 64


@dataclass(slots=False)
class CommandHistoryEntry:
    ts: str
    trace_id: str | None
    text_preview: str
    outcome: str
    safety: str
    reason_code: str


@dataclass(slots=False)
class MoveHistoryEntry:
    ts: str
    trace_id: str | None
    move_id: str
    outcome: str
    voice_preview: str


@dataclass(slots=False)
class TelemetryHistoryEntry:
    ts: str
    compact: dict[str, Any]


@dataclass(slots=False)
class ModeHistoryEntry:
    ts: str
    from_mode: str
    to_mode: str


@dataclass
class SessionMemory:
    pilot_display_name: str | None = None
    pilot_callsign: str | None = None
    last_intent: str | None = None
    preferences: dict[str, Any] = field(default_factory=dict)
    recent_turns: deque[dict[str, str]] = field(
        default_factory=lambda: deque(maxlen=30),
    )
    mission_notes: list[str] = field(default_factory=list)

    command_history: deque[CommandHistoryEntry] = field(default_factory=lambda: deque(maxlen=120))
    move_history: deque[MoveHistoryEntry] = field(default_factory=lambda: deque(maxlen=80))
    telemetry_history: deque[TelemetryHistoryEntry] = field(default_factory=lambda: deque(maxlen=36))
    mode_history: deque[ModeHistoryEntry] = field(default_factory=lambda: deque(maxlen=48))

    # Presentation / voice UX (session-only until Postgres persistence)
    wake_strip_enabled: bool = True
    wake_prefixes: list[str] = field(
        default_factory=lambda: [
            "Kaiser,",
            "Kaiser:",
            "Hey Kaiser,",
            "Ok Kaiser,",
            "Yo Kaiser,",
        ],
    )

    def append_turn(self, role: str, content: str) -> None:
        self.recent_turns.append(
            {
                "role": role,
                "content": content,
                "ts": datetime.now(UTC).isoformat(),
            }
        )

    def record_command(
        self,
        *,
        text_preview: str,
        outcome: str,
        safety_decision: str,
        reason_code: str,
        trace_id: str | None,
    ) -> None:
        self.command_history.append(
            CommandHistoryEntry(
                ts=datetime.now(UTC).isoformat(),
                trace_id=trace_id,
                text_preview=text_preview[:_PREVIEW],
                outcome=outcome,
                safety=safety_decision,
                reason_code=reason_code,
            )
        )

    def record_move(
        self,
        *,
        move_id: str,
        outcome: str,
        voice_line: str,
        trace_id: str | None,
    ) -> None:
        self.move_history.append(
            MoveHistoryEntry(
                ts=datetime.now(UTC).isoformat(),
                trace_id=trace_id,
                move_id=move_id,
                outcome=outcome,
                voice_preview=voice_line[:160],
            )
        )

    def record_telemetry_compact(self, compact: dict[str, Any]) -> None:
        self.telemetry_history.append(
            TelemetryHistoryEntry(ts=datetime.now(UTC).isoformat(), compact=dict(compact))
        )

    def record_mode_transition(self, from_mode: str, to_mode: str) -> None:
        self.mode_history.append(
            ModeHistoryEntry(
                ts=datetime.now(UTC).isoformat(),
                from_mode=from_mode,
                to_mode=to_mode,
            )
        )

    def merge_preferences(self, patch: dict[str, Any]) -> None:
        """Shallow merge with caps — values must be JSON-serializable scalars or small dicts."""
        if not patch:
            return
        for key, val in list(patch.items())[:_MAX_PREF_KEYS]:
            if not isinstance(key, str) or len(key) > 120:
                continue
            if isinstance(val, (dict, list)) and len(repr(val)) > 4000:
                continue
            if isinstance(val, str) and len(val) > 4000:
                continue
            self.preferences[key] = val

        while len(self.preferences) > _MAX_PREF_KEYS:
            drop = next(iter(self.preferences))
            del self.preferences[drop]

    def to_llm_messages(self, max_items: int = 20) -> list[dict[str, str]]:
        return [dict(r) for r in list(self.recent_turns)[-max_items:]]

    def export_api_safe(self, *, truncate: int = 256) -> dict[str, Any]:
        """Structured session memory for cockpit inspection — excludes raw avatar payloads."""

        def _clip(s: str) -> str:
            return s if len(s) <= truncate else f"{s[: truncate - 3]}..."

        turns_out: list[dict[str, str]] = []
        for row in list(self.recent_turns)[-24:]:
            turns_out.append(
                {
                    "role": row.get("role", "?"),
                    "ts": row.get("ts", ""),
                    "content_preview": _clip(row.get("content", "")),
                }
            )

        return {
            "pilot_display_name": self.pilot_display_name,
            "pilot_callsign": self.pilot_callsign,
            "preferences": dict(self.preferences),
            "last_intent": self.last_intent,
            "wake_strip_enabled": self.wake_strip_enabled,
            "wake_prefixes": list(self.wake_prefixes)[:48],
            "avatar_configured": True,  # SPA ships bundled Mazinkaiser SKL GLB; no likeness data URL lane
            "recent_turn_summaries": turns_out,
            "command_history": [e.__dict__ for e in self.command_history],
            "move_history": [e.__dict__ for e in self.move_history],
            "telemetry_history": [e.__dict__ for e in self.telemetry_history],
            "mode_history": [e.__dict__ for e in self.mode_history],
            "mission_notes": [_clip(n) for n in self.mission_notes[-12:]],
        }
