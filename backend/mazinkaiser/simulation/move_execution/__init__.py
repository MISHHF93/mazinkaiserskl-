"""Scalable Move Execution Engine — batch pipeline per canonical technique."""

from mazinkaiser.simulation.move_execution.advisor import ranked_move_recommendations, suggest_alternative_moves, tactical_move_hint
from mazinkaiser.simulation.move_execution.batch_models import (
    BatchStepKind,
    BatchStepReport,
    MoveBatchOutcome,
    MoveBatchReport,
)
from mazinkaiser.simulation.move_execution.engine import MoveExecutionEngine
from mazinkaiser.simulation.move_execution.move_definition import AnimationCue, GateRules, MoveDefinition, TelemetryModel
from mazinkaiser.simulation.move_execution.move_family import MoveFamily
from mazinkaiser.simulation.move_execution.registry import get_move_definition, iterate_move_definitions

__all__ = [
    "AnimationCue",
    "BatchStepKind",
    "BatchStepReport",
    "GateRules",
    "MoveBatchOutcome",
    "MoveBatchReport",
    "MoveDefinition",
    "MoveExecutionEngine",
    "MoveFamily",
    "TelemetryModel",
    "get_move_definition",
    "iterate_move_definitions",
    "ranked_move_recommendations",
    "suggest_alternative_moves",
    "tactical_move_hint",
]
