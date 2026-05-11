"""Unreal Engine bridge (stub).

Contract: ingest twin telemetry snapshots and emit scripted sequences / cinematics via
your game's subsystem. Prefer gRPC or shared-memory for LAN; MQTT for WAN lab setups.
"""


from typing import Protocol, runtime_checkable


@runtime_checkable
class UnrealTwinBridgePort(Protocol):
    async def publish_telemetry_tick(self, session_id: str, payload: dict) -> None:
        ...

    async def publish_move_overlay(self, session_id: str, move_batch: dict) -> None:
        ...
