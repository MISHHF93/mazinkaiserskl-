"""Session-scoped pub/sub with a single telemetry ticker per session (no double twin steps)."""

from __future__ import annotations

import asyncio
from collections import defaultdict

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Final

import structlog

from mazinkaiser.core.config import get_settings
from mazinkaiser.runtime import engine as shared_engine
from mazinkaiser.runtime import get_memory

log = structlog.get_logger(__name__)

_DEFAULT_TOPICS: Final[frozenset[str]] = frozenset({"telemetry", "moves", "avatar", "assistant"})


def _parse_topics_param(raw: str | None) -> frozenset[str]:
    if not raw or not raw.strip():
        return _DEFAULT_TOPICS
    parts = {p.strip().lower() for p in raw.split(",") if p.strip()}
    if not parts:
        return _DEFAULT_TOPICS
    # Normalise aliases
    norm: set[str] = set()
    for p in parts:
        if p in ("ai", "chat", "assistant"):
            norm.add("assistant")
        elif p in ("move", "moves"):
            norm.add("moves")
        elif p in ("avatar", "pilot"):
            norm.add("avatar")
        elif p in ("telemetry", "hud", "state"):
            norm.add("telemetry")
        else:
            norm.add(p)
    return frozenset(norm & _DEFAULT_TOPICS) or _DEFAULT_TOPICS


@dataclass
class BoundSubscriber:
    queue: asyncio.Queue[dict[str, Any]]
    topics: frozenset[str] = field(default_factory=lambda: _DEFAULT_TOPICS)


class RealtimeHub:
    """
    - One asyncio task advances the digital twin per `session_id` while any subscriber
      wants telemetry and/or avatar ticks (avoids N connections stepping the twin N×).
    - `moves` events are pushed when REST/simulation completes a batch.
    """

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._subs: defaultdict[str, list[BoundSubscriber]] = defaultdict(list)
        self._telemetry_tasks: dict[str, asyncio.Task[None]] = {}
        self._telemetry_refs: dict[str, int] = defaultdict(int)

    def parse_topics_query(self, raw: str | None) -> frozenset[str]:
        return _parse_topics_param(raw)

    async def attach(
        self,
        session_id: str,
        *,
        topics: frozenset[str] | None = None,
    ) -> tuple[asyncio.Queue[dict[str, Any]], BoundSubscriber]:
        t = topics or _DEFAULT_TOPICS
        sub = BoundSubscriber(queue=asyncio.Queue(maxsize=512), topics=t)
        async with self._lock:
            self._subs[session_id].append(sub)
            if self._wants_telemetry_tick(t):
                self._telemetry_refs[session_id] += 1
                if session_id not in self._telemetry_tasks:
                    self._telemetry_tasks[session_id] = asyncio.create_task(
                        self._telemetry_worker(session_id),
                        name=f"rt-telemetry-{session_id[:8]}",
                    )
        return sub.queue, sub

    def _wants_telemetry_tick(self, topics: frozenset[str]) -> bool:
        return bool(topics & frozenset({"telemetry", "avatar"}))

    async def detach(self, session_id: str, sub: BoundSubscriber) -> None:
        task_to_join: asyncio.Task[None] | None = None
        async with self._lock:
            subs = self._subs.get(session_id)
            if not subs or sub not in subs:
                return
            subs.remove(sub)
            if not subs:
                del self._subs[session_id]
            if self._wants_telemetry_tick(sub.topics):
                self._telemetry_refs[session_id] -= 1
                if self._telemetry_refs[session_id] <= 0:
                    self._telemetry_refs.pop(session_id, None)
                    task_to_join = self._telemetry_tasks.pop(session_id, None)
                    if task_to_join is not None:
                        task_to_join.cancel()
        if task_to_join is not None:
            try:
                await task_to_join
            except asyncio.CancelledError:
                pass

    async def rebind_topics(self, session_id: str, sub: BoundSubscriber, topics: frozenset[str]) -> None:
        """Change subscription topics (e.g. after a client `hello` frame)."""
        new_t = topics & _DEFAULT_TOPICS or _DEFAULT_TOPICS
        task_to_join: asyncio.Task[None] | None = None
        async with self._lock:
            old_t = sub.topics
            sub.topics = new_t
            old_tick = self._wants_telemetry_tick(old_t)
            new_tick = self._wants_telemetry_tick(new_t)
            if old_tick and not new_tick:
                self._telemetry_refs[session_id] -= 1
                if self._telemetry_refs[session_id] <= 0:
                    self._telemetry_refs.pop(session_id, None)
                    task_to_join = self._telemetry_tasks.pop(session_id, None)
                    if task_to_join is not None:
                        task_to_join.cancel()
            elif not old_tick and new_tick:
                self._telemetry_refs[session_id] += 1
                if session_id not in self._telemetry_tasks:
                    self._telemetry_tasks[session_id] = asyncio.create_task(
                        self._telemetry_worker(session_id),
                        name=f"rt-telemetry-{session_id[:8]}",
                    )
        if task_to_join is not None:
            try:
                await task_to_join
            except asyncio.CancelledError:
                pass

    async def publish(self, session_id: str, topic: str, message: dict[str, Any]) -> None:
        """Enqueue to every bound subscriber for `session_id` that includes `topic`."""
        async with self._lock:
            bucket = list(self._subs.get(session_id, ()))
        for sub in bucket:
            if topic not in sub.topics:
                continue
            try:
                sub.queue.put_nowait(message)
            except asyncio.QueueFull:
                log.warning("realtime_queue_drop", session_id=session_id, topic=topic)

    async def _telemetry_worker(self, session_id: str) -> None:
        settings = get_settings()
        interval = max(0.3, float(settings.ws_telemetry_interval_s))
        engine = shared_engine
        seq = 0
        while True:
            try:
                await asyncio.sleep(interval)
                sess = engine.get_or_create(session_id)
                state = sess.tick()
                ts = datetime.now(UTC).isoformat()
                mem = get_memory(session_id)
                seq += 1
                tele_body = {
                    "type": "telemetry",
                    "seq": seq,
                    "ts": ts,
                    "session_id": session_id,
                    "telemetry": state.model_dump_json_safe(),
                }
                await self.publish(session_id, "telemetry", tele_body)
                avatar_body = {
                    "type": "avatar_state",
                    "seq": seq,
                    "ts": ts,
                    "session_id": session_id,
                    "avatar": {
                        "avatar_configured": True,
                        "pilot_display_name_set": bool(mem.pilot_display_name),
                        "pilot_callsign_set": bool(mem.pilot_callsign),
                        "mode": str(state.mode),
                        "wake_strip_enabled": mem.wake_strip_enabled,
                    },
                }
                await self.publish(session_id, "avatar", avatar_body)
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001
                log.exception("telemetry_worker_error", session_id=session_id)

    async def broadcast_move_event(
        self,
        session_id: str,
        *,
        move_batch: dict[str, Any],
        trace_id: str | None = None,
        telemetry: dict[str, Any] | None = None,
    ) -> None:
        body: dict[str, Any] = {
            "type": "move_event",
            "ts": datetime.now(UTC).isoformat(),
            "session_id": session_id,
            "trace_id": trace_id,
            "move_batch": move_batch,
        }
        if telemetry is not None:
            body["telemetry"] = telemetry
        await self.publish(session_id, "moves", body)

    def cancel_all_workers(self) -> None:
        """Sync cancel telemetry workers (test / process teardown safety)."""
        for t in list(self._telemetry_tasks.values()):
            t.cancel()
        self._telemetry_tasks.clear()
        self._telemetry_refs.clear()
        self._subs.clear()


_HUB: RealtimeHub | None = None


def reset_realtime_hub() -> None:
    """Drop the process-wide hub and stop background tasks."""
    global _HUB
    if _HUB is not None:
        _HUB.cancel_all_workers()
    _HUB = None


def get_realtime_hub() -> RealtimeHub:
    global _HUB
    if _HUB is None:
        _HUB = RealtimeHub()
    return _HUB
