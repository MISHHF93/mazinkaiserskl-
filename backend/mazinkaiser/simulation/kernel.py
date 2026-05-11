"""Digital twin kernel — single source of executable mecha simulation per session."""

from __future__ import annotations

from collections import deque
from typing import Any

import random

from mazinkaiser.domain.mecha_state import MechaState
from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.domain.moves import KaiserMove
from mazinkaiser.domain.pilot_sync import PilotRecognitionState
from mazinkaiser.domain.twin_state import PilderDockingTelemetryStatus, TwinOperationalState, TwinStateInputEvent
from mazinkaiser.simulation.directives import SimulationDirective, apply_directive
from mazinkaiser.simulation.move_execution.batch_models import MoveBatchOutcome
from mazinkaiser.simulation.move_execution.engine import MoveExecutionContext, MoveExecutionEngine
from mazinkaiser.simulation.move_execution.registry import all_moves_registered
from mazinkaiser.simulation.projection import project_to_mecha_state
from mazinkaiser.simulation.simulation_event import TwinEvent, TwinEventKind, serialize_twin_event
from mazinkaiser.simulation.state_input_events import apply_twin_state_input_event
from mazinkaiser.simulation.subsystems import subsystem_idle_tick
from mazinkaiser.simulation.twin_derived import recompute_derived_telemetry, sync_movement_state
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot
from mazinkaiser.simulation.twin_validate import clamp_pct, clamp_snapshot_inplace


class DigitalTwinKernel:
    """Authoritative executable simulation clock for one Mazinkaiser instance."""

    def __init__(
        self,
        rng: random.Random | None = None,
        *,
        max_events: int = 400,
    ) -> None:
        self._rng = rng or random.Random()
        self._snapshot = TwinSnapshot()
        self._events: deque[TwinEvent] = deque(maxlen=max_events)
        self._last_batch_report: dict[str, Any] | None = None

    @property
    def snapshot(self) -> TwinSnapshot:
        return self._snapshot

    @property
    def last_batch_report(self) -> dict[str, Any] | None:
        """Last Move Execution Engine outcome (serialized)."""

        return self._last_batch_report

    def _emit(self, kind: TwinEventKind, summary: str, payload: dict | None = None) -> TwinEvent:
        self._snapshot.event_seq += 1
        ev = TwinEvent(
            seq=self._snapshot.event_seq,
            kind=kind,
            clock_s=self._snapshot.simulation_clock_s,
            summary=summary,
            payload=payload or {},
        )
        self._events.append(ev)
        return ev

    def _finalize_hud_projection(self, mode: PersonalityMode) -> MechaState:
        """Recompute derived telemetry + clamps after any snapshot mutation."""

        recompute_derived_telemetry(self._snapshot)
        sync_movement_state(self._snapshot)
        clamp_snapshot_inplace(self._snapshot)
        return project_to_mecha_state(self._snapshot, mode)

    def step(self, dt: float, mode: PersonalityMode) -> MechaState:
        """Advance regulator subsystems."""

        subsystem_idle_tick(self._snapshot, dt, self._rng, mode)
        self._snapshot.simulation_clock_s += dt
        return project_to_mecha_state(self._snapshot, mode)

    def run_diagnostics(self, mode: PersonalityMode) -> MechaState:
        """Normalize systems for narrative + HUD."""

        snap = self._snapshot
        snap.operational_state = TwinOperationalState.DIAGNOSTIC
        snap.armor_integrity_pct = clamp_pct(snap.armor_integrity_pct + self._rng.uniform(0.2, 0.9))
        snap.heat_pct = clamp_pct(snap.heat_pct * (0.78 + self._rng.uniform(0, 0.06)))
        snap.photon_reserve_pct = clamp_pct(snap.photon_reserve_pct + self._rng.uniform(0.8, 2.8))
        snap.tactical_band = "CLEAR"
        snap.structural_stress_pct = max(
            0.0,
            min(120.0, snap.structural_stress_pct - self._rng.uniform(6.0, 12.0)),
        )
        snap.movement_ready = True
        apply_directive(SimulationDirective.SYNC_RECALIBRATED, snap, self._rng)
        snap.alerts_active = [a for a in snap.alerts_active if not a.startswith("AUTO_CORE_DECLARED")]
        snap.operational_state = TwinOperationalState.IDLE
        self._emit(
            TwinEventKind.DIAGNOSTICS,
            "Kaiser Core diagnostic lattice converged.",
            {"heat_pct": snap.heat_pct},
        )
        return self._finalize_hud_projection(mode)

    def reset_state_safe(self, mode: PersonalityMode) -> MechaState:
        """Factory-default twin snapshot — audit via STATE_INPUT."""

        self._snapshot = TwinSnapshot()
        self._last_batch_report = None
        out = self._finalize_hud_projection(mode)
        self._emit(
            TwinEventKind.STATE_INPUT,
            "Twin state engine reset — factory telemetry baseline restored.",
            {"operational_state": self._snapshot.operational_state.value},
        )
        return out

    def apply_state_input_event(
        self,
        event: TwinStateInputEvent,
        payload: dict[str, Any],
        mode: PersonalityMode,
    ) -> MechaState:
        """Validated discrete events (excluding diagnostics, which loops through `run_diagnostics`)."""

        if event == TwinStateInputEvent.DIAGNOSTICS_RUN:
            return self.run_diagnostics(mode)
        detail = apply_twin_state_input_event(self._snapshot, event, payload, self._rng)
        self._emit(
            TwinEventKind.STATE_INPUT,
            f"State input accepted: {event.value}",
            detail,
        )
        return project_to_mecha_state(self._snapshot, mode)

    def execute_move(
        self,
        move: KaiserMove,
        mode: PersonalityMode,
        *,
        pilot_authorized: bool = True,
        strict_safety: bool = True,
    ) -> MechaState:
        ctx = MoveExecutionContext(
            snapshot=self._snapshot,
            rng=self._rng,
            mode=mode,
            move=move,
            pilot_authorized=pilot_authorized,
            strict_safety=strict_safety,
        )
        report = MoveExecutionEngine.run(ctx)
        self._last_batch_report = report.to_dict()
        self._emit(
            TwinEventKind.MOVE_BATCH,
            f"Move batch {report.outcome.value}: {move.value}",
            self._last_batch_report,
        )
        self._emit(
            TwinEventKind.MOVE_SIMULATED,
            report.voice_line[:220],
            {
                "move": move.value,
                "outcome": report.outcome.value,
                "voice_line": report.voice_line,
            },
        )
        if report.outcome == MoveBatchOutcome.ACCEPTED:
            self._snapshot.operational_state = TwinOperationalState.COMBAT_SIMULATION
        return self._finalize_hud_projection(mode)

    def apply_simulation_directive(self, directive: SimulationDirective, mode: PersonalityMode) -> MechaState:
        outcome = apply_directive(directive, self._snapshot, self._rng)
        self._emit(
            TwinEventKind.DIRECTIVE,
            f"Directive executed: {directive.value}",
            outcome,
        )
        return self._finalize_hud_projection(mode)

    def pilder_dock_sequence(
        self,
        mode: PersonalityMode,
        *,
        sync_boost_pct: float | None = None,
        recognize_pilot: bool = True,
    ) -> MechaState:
        snap = self._snapshot
        snap.pilder_docking_status = PilderDockingTelemetryStatus.SYNCING
        bump = clamp_pct(sync_boost_pct, 0.0, 85.0) if sync_boost_pct is not None else self._rng.uniform(4.5, 9.8)
        snap.pilot_sync_pct = clamp_pct(snap.pilot_sync_pct + bump, 0.0, 125.0)
        snap.sync_rate_pct = clamp_pct(snap.sync_rate_pct + self._rng.uniform(1.5, 3.9))
        if recognize_pilot:
            snap.pilot_recognition_status = PilotRecognitionState.VERIFIED
            snap.pilot_biometric_confidence_pct = clamp_pct(self._rng.uniform(86.0, 98.8))
        snap.pilot_stress_pct = clamp_pct(snap.pilot_stress_pct - self._rng.uniform(2.8, 8.8))
        snap.pilder_docking_status = PilderDockingTelemetryStatus.DOCKED
        self._emit(
            TwinEventKind.PILDER_PILOT,
            "Pilder dock + pilot link calibration (simulation).",
            {
                "docking_status": snap.pilder_docking_status.value,
                "pilot_sync_pct": snap.pilot_sync_pct,
                "recognition": snap.pilot_recognition_status.value,
                "confidence_pct": snap.pilot_biometric_confidence_pct,
            },
        )
        return self._finalize_hud_projection(mode)

    def pilder_undock_sequence(self, mode: PersonalityMode, *, emergency: bool = False) -> MechaState:
        snap = self._snapshot
        if emergency:
            snap.pilder_docking_status = PilderDockingTelemetryStatus.EMERGENCY_EGRESS_ARMED
            snap.pilot_stress_pct = clamp_pct(snap.pilot_stress_pct + self._rng.uniform(14.0, 28.0))
            snap.pilot_sync_pct = clamp_pct(snap.pilot_sync_pct - self._rng.uniform(8.0, 18.0), 0.0, 125.0)
            snap.alerts_active.append("EMERGENCY_PILDER_SEPARATION_SIM")
        snap.pilder_docking_status = PilderDockingTelemetryStatus.SEPARATED
        snap.pilot_recognition_status = PilotRecognitionState.LATENT
        snap.pilot_biometric_confidence_pct = clamp_pct(self._rng.uniform(12.0, 36.0))
        snap.sync_rate_pct = clamp_pct(snap.sync_rate_pct - self._rng.uniform(2.0, 5.5))
        self._emit(
            TwinEventKind.PILDER_PILOT,
            "Pilder separation — observe-only mantle (simulation).",
            {"emergency": emergency, "docking_status": snap.pilder_docking_status.value},
        )
        return self._finalize_hud_projection(mode)

    def pilot_sync_calibration(
        self,
        mode: PersonalityMode,
        *,
        target_pilot_sync_pct: float | None = None,
        pilot_sync_delta_pct: float | None = None,
        stress_delta_pct: float | None = None,
        alleviate_stress: bool = False,
        initiate_safe_shutdown: bool = False,
        recognize_pilot: bool = False,
    ) -> MechaState:
        if initiate_safe_shutdown:
            return self.initiate_safe_shutdown_protocol(mode)
        if (
            target_pilot_sync_pct is None
            and pilot_sync_delta_pct is None
            and stress_delta_pct is None
            and not alleviate_stress
            and not recognize_pilot
        ):
            return self._finalize_hud_projection(mode)
        snap = self._snapshot
        if target_pilot_sync_pct is not None:
            snap.pilot_sync_pct = clamp_pct(float(target_pilot_sync_pct), 0.0, 125.0)
        if pilot_sync_delta_pct is not None:
            snap.pilot_sync_pct = clamp_pct(snap.pilot_sync_pct + float(pilot_sync_delta_pct), 0.0, 125.0)
        if stress_delta_pct is not None:
            snap.pilot_stress_pct = clamp_pct(snap.pilot_stress_pct + float(stress_delta_pct))
        if alleviate_stress:
            snap.pilot_stress_pct = clamp_pct(snap.pilot_stress_pct - self._rng.uniform(7.0, 14.8))
        if recognize_pilot:
            snap.pilot_recognition_status = PilotRecognitionState.VERIFIED
            snap.pilot_biometric_confidence_pct = clamp_pct(self._rng.uniform(82.0, 96.5))
        self._emit(
            TwinEventKind.PILDER_PILOT,
            "Pilot sync / stress manifold update (simulation).",
            {"pilot_sync_pct": snap.pilot_sync_pct, "pilot_stress_pct": snap.pilot_stress_pct},
        )
        return self._finalize_hud_projection(mode)

    def initiate_safe_shutdown_protocol(self, mode: PersonalityMode) -> MechaState:
        snap = self._snapshot
        snap.operational_state = TwinOperationalState.SHUTDOWN_SAFE
        snap.reactor_output_pct = clamp_pct(snap.reactor_output_pct * self._rng.uniform(0.45, 0.58))
        snap.pilot_sync_pct = clamp_pct(snap.pilot_sync_pct * self._rng.uniform(0.55, 0.68), 0.0, 125.0)
        snap.pilot_recognition_status = PilotRecognitionState.LATENT
        snap.pilot_stress_pct = clamp_pct(snap.pilot_stress_pct * 0.75)
        snap.pilot_biometric_confidence_pct = clamp_pct(
            min(snap.pilot_biometric_confidence_pct, self._rng.uniform(18.0, 42.0)),
        )
        snap.movement_ready = False
        snap.alerts_active.append("SAFE_SHUTDOWN_PROTOCOL_SIM")
        self._emit(
            TwinEventKind.PILDER_PILOT,
            "Safe shutdown lattice — strike authority degraded (simulation).",
            {"operational_state": snap.operational_state.value},
        )
        return self._finalize_hud_projection(mode)

    def latest_events(self, limit: int = 50) -> list[dict]:
        tail = list(self._events)[-limit:]
        return [serialize_twin_event(e) for e in tail]

    def to_mecha_state(self, mode: PersonalityMode) -> MechaState:
        return project_to_mecha_state(self._snapshot, mode)

    def registry_integrity_ok(self) -> bool:
        return all_moves_registered()
