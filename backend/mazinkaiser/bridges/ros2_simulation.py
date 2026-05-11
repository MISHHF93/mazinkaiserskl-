"""ROS 2 simulation adapter (stub).

Intended wiring: ROS2 topics for joint states / Gazebo-compatible markers; Mazinkaiser remains
authority for narrative safety envelopes — never forward raw harmful commands unchecked.
"""


from typing import Protocol, runtime_checkable


@runtime_checkable
class ROS2SimulationAdapterPort(Protocol):
    def topic_prefix(self) -> str:
        ...

    async def broadcast_joint_goal(self, session_id: str, frame_id: str, payload: dict) -> None:
        ...
