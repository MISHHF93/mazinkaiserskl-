"""Real-time fan-out for WebSocket clients (telemetry, moves, avatar projection)."""

from mazinkaiser.realtime.hub import RealtimeHub, get_realtime_hub, reset_realtime_hub

__all__ = ["RealtimeHub", "get_realtime_hub", "reset_realtime_hub"]
