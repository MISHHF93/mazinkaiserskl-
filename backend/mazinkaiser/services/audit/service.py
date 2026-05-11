"""Structured audit trail — JSON lines + in-process ring buffer for API reads."""

from __future__ import annotations

import json
import uuid
from collections import deque
from collections.abc import Mapping
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from typing import Any, Literal

from mazinkaiser.core.config import Settings, get_settings
from mazinkaiser.core.request_trace import get_trace_id

AuditKind = Literal[
    "command_trace",
    "assistant_reply",
    "safety_decision",
    "move_execution",
    "diagnostic_run",
    "session_mode_change",
    "memory_update",
    "preference_update",
    "voice_ingest",
    "system",
]

_lock = Lock()
_buffer: deque[dict[str, Any]] = deque(maxlen=5000)


def _utc_now() -> str:
    return datetime.now(UTC).isoformat()


def append_audit_line(settings: Settings, record: Mapping[str, Any]) -> None:
    """Append one JSON object to the configured audit file (best-effort)."""
    path = Path(settings.audit_log_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(dict(record), ensure_ascii=False) + "\n"
    with path.open("a", encoding="utf-8") as f:
        f.write(line)


def log_audit_event(
    kind: AuditKind,
    payload: dict[str, Any],
    *,
    session_id: str | None = None,
    trace_id: str | None = None,
) -> dict[str, Any]:
    """
    Persist a structured audit row and mirror it into the in-memory buffer.
    Content must be non-PII summaries (previews, enums, counts) — callers redact.
    """
    settings = get_settings()
    tid = trace_id or get_trace_id() or str(uuid.uuid4())
    row: dict[str, Any] = {
        "ts": _utc_now(),
        "kind": kind,
        "trace_id": tid,
        "session_id": session_id,
        "payload": payload,
    }

    append_audit_line(settings, row)

    with _lock:
        _buffer.append(row)

    return row


def read_recent_audit_events(
    *,
    limit: int = 100,
    session_id: str | None = None,
    kind: AuditKind | None = None,
) -> list[dict[str, Any]]:
    """Serve newest-first rows from the ring buffer."""
    lim = max(1, min(limit, 1000))

    with _lock:
        rows = list(_buffer)

    if session_id is not None:
        rows = [r for r in rows if r.get("session_id") == session_id]
    if kind is not None:
        rows = [r for r in rows if r.get("kind") == kind]

    rows.reverse()
    return rows[:lim]
