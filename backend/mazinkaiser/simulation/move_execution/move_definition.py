"""Declarative move catalogue — data, not one-off functions."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from mazinkaiser.domain.moves import KaiserMove
from mazinkaiser.domain.pilot_sync import PilotSyncTier
from mazinkaiser.simulation.move_execution.move_family import MoveFamily


@dataclass(frozen=True)
class TelemetryModel:
    """Energy / heat / frame model coefficients (dimensionless cockpit units)."""

    intensity: float
    photon_draw: float
    heat_gain: float
    energy_draw: float
    reactor_pulse: float
    structural_pulse: float
    sync_penalty: float
    cooldown_seconds: float
    demo_banner_seconds: float
    actuator_lock_chance: float
    environmental_coupling: float = 0.15
    """0–1 scaler for stochastic environmental coupling on simulated impact variance."""


@dataclass(frozen=True)
class GateRules:
    min_photon_pct: float
    max_allowed_heat_pct: float = 94.0
    min_armor_pct: float = 8.0
    min_sync_pct: float = 45.0
    min_energy_pct: float = 12.0
    min_synchro_bandwidth_pct: float = 40.0
    require_movement_ready: bool = False
    disallow_if_cooldown_active: bool = True


@dataclass(frozen=True)
class AnimationCue:
    phase: str
    hud_event: str
    duration_ms: int
    severity: str = "info"
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class MoveDefinition:
    """Single registry entry driving validation, batch sequence, VO template, adapters."""

    move: KaiserMove
    family: MoveFamily
    gates: GateRules
    telemetry: TelemetryModel
    animation_cues: tuple[AnimationCue, ...]
    voice_success_fmt: str
    voice_refused_gate_fmt: str
    voice_refused_cooldown_fmt: str
    tactical_tags: tuple[str, ...]
    adapter_hook: str
    prep_simulation_s: float = 0.35
    """Future: hook for scene graph / Live2D layer id."""

    required_pilot_sync_tier: PilotSyncTier = PilotSyncTier.COMBAT_READY
    """Minimum pilot link tier (`pilot_sync_pct` bands) required to arm this move."""

    narrative_id: str = ""
