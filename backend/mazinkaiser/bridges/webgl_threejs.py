"""WebGL / Three.js avatar transport (stub).

Privacy: ship presentation hints (`avatar_configured`, blend shapes index) rather than embedding
pilots' raw image payloads on the wire unless E2EE + explicit consent.
"""


from typing import Protocol, runtime_checkable


@runtime_checkable
class WebGLAvatarPort(Protocol):
    async def stream_avatar_hints(self, session_id: str, hints: dict) -> None:
        ...
