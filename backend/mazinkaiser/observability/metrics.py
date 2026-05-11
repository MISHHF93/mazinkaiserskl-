"""Prometheus text exposition without external dependencies (swap for prometheus_client later)."""

from __future__ import annotations

import threading
from dataclasses import dataclass, field


@dataclass
class Counter:
    name: str
    help: str
    _v: int = 0
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def inc(self, n: int = 1) -> None:
        with self._lock:
            self._v += n

    def get(self) -> int:
        with self._lock:
            return self._v

    def render(self) -> str:
        with self._lock:
            v = self._v
        return (
            f"# HELP {self.name} {self.help}\n"
            f"# TYPE {self.name} counter\n"
            f"{self.name} {v}\n"
        )


@dataclass
class Gauge:
    name: str
    help: str
    _v: float = 0.0
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def set(self, v: float) -> None:
        with self._lock:
            self._v = v

    def inc(self, n: float = 1) -> None:
        with self._lock:
            self._v += n

    def dec(self, n: float = 1) -> None:
        with self._lock:
            self._v -= n

    def render(self) -> str:
        with self._lock:
            v = self._v
        return (
            f"# HELP {self.name} {self.help}\n"
            f"# TYPE {self.name} gauge\n"
            f"{self.name} {v}\n"
        )


WS_CONNECTIONS_TOTAL = Counter(
    "mazinkaiser_ws_connections_total",
    "Accepted WebSocket connections (cockpit stream).",
)
WS_MESSAGES_IN_TOTAL = Counter(
    "mazinkaiser_ws_messages_in_total",
    "Inbound JSON frames parsed on cockpit WebSocket.",
)
WS_MESSAGES_OUT_TOTAL = Counter(
    "mazinkaiser_ws_messages_out_total",
    "Outbound JSON frames sent on cockpit WebSocket.",
)
HTTP_REQUESTS_TOTAL = Counter(
    "mazinkaiser_http_requests_total",
    "HTTP requests handled (middleware, best-effort).",
)
REALTIME_MOVES_PUBLISHED_TOTAL = Counter(
    "mazinkaiser_realtime_moves_published_total",
    "Move batch events published to realtime subscribers.",
)
WS_ACTIVE_CONNECTIONS = Gauge(
    "mazinkaiser_ws_active_connections",
    "Currently open cockpit WebSocket connections.",
)


def render_metrics_registry() -> str:
    chunks = [
        WS_CONNECTIONS_TOTAL.render(),
        WS_ACTIVE_CONNECTIONS.render(),
        WS_MESSAGES_IN_TOTAL.render(),
        WS_MESSAGES_OUT_TOTAL.render(),
        HTTP_REQUESTS_TOTAL.render(),
        REALTIME_MOVES_PUBLISHED_TOTAL.render(),
    ]
    return "\n".join(chunks) + "\n"
