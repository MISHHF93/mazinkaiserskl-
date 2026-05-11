"""Unity bridge (stub).

Mirror `UnrealTwinBridgePort` semantics; serialize with JSON or FlatBuffers depending on latency budget.
"""


from typing import Protocol, runtime_checkable


@runtime_checkable
class UnityTwinBridgePort(Protocol):
    async def ingest_hud_tick(self, session_id: str, telemetry: dict) -> None:
        ...

    async def trigger_move_visual(self, session_id: str, move_batch: dict) -> None:
        ...
