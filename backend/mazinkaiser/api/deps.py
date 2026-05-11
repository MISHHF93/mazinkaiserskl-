"""FastAPI dependency providers."""

from typing import Annotated

from fastapi import Depends

from mazinkaiser.core.config import Settings, get_settings
from mazinkaiser.runtime import engine as runtime_engine
from mazinkaiser.runtime import tactical as runtime_tactical
from mazinkaiser.services.ai.orchestrator import AIOrchestrator
from mazinkaiser.services.state_engine import StateEngine
from mazinkaiser.services.tactical.simulation import TacticalSimulationService


def get_state_engine() -> StateEngine:
    return runtime_engine


def get_tactical() -> TacticalSimulationService:
    return runtime_tactical


def get_orchestrator(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AIOrchestrator:
    return AIOrchestrator(settings)


SettingsDep = Annotated[Settings, Depends(get_settings)]
StateEngineDep = Annotated[StateEngine, Depends(get_state_engine)]
TacticalDep = Annotated[TacticalSimulationService, Depends(get_tactical)]
OrchestratorDep = Annotated[AIOrchestrator, Depends(get_orchestrator)]
