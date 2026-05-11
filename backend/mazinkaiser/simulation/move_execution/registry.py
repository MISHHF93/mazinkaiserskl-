"""Canonical move registry accessors."""

from __future__ import annotations

from mazinkaiser.domain.moves import KaiserMove
from mazinkaiser.simulation.move_execution.move_definition import MoveDefinition
from mazinkaiser.simulation.move_execution.registry_build import build_move_registry


_MOVE_REGISTRY: dict[KaiserMove, MoveDefinition] = build_move_registry()


def get_move_definition(move: KaiserMove) -> MoveDefinition:
    return _MOVE_REGISTRY[move]


def iterate_move_definitions() -> list[MoveDefinition]:
    """Stable enum order."""

    return [_MOVE_REGISTRY[m] for m in KaiserMove if m in _MOVE_REGISTRY]


def all_moves_registered() -> bool:
    return set(_MOVE_REGISTRY.keys()) == set(KaiserMove)
