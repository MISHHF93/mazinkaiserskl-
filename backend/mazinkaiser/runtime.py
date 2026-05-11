"""
Process-wide singletons for MVP. Replace with DI container / Redis for scale-out.
"""

from __future__ import annotations

from mazinkaiser.services.memory.session import SessionMemory
from mazinkaiser.services.state_engine import StateEngine
from mazinkaiser.services.tactical.simulation import TacticalSimulationService

engine = StateEngine()
tactical = TacticalSimulationService()
memories: dict[str, SessionMemory] = {}


def get_memory(session_id: str) -> SessionMemory:
    if session_id not in memories:
        memories[session_id] = SessionMemory()
    return memories[session_id]
