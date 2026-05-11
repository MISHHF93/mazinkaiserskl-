"""In-memory session cockpit state — delegates to `DigitalTwinKernel`."""

from __future__ import annotations

import random
from uuid import uuid4

from mazinkaiser.domain.mecha_state import MechaState
from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.domain.moves import KaiserMove
from mazinkaiser.domain.twin_state import TwinStateInputEvent
from mazinkaiser.simulation.directives import SimulationDirective
from mazinkaiser.simulation.kernel import DigitalTwinKernel
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot


class CockpitSession:
    """Per-connection session: twin kernel + HUD projection."""

    def __init__(self, session_id: str | None = None, *, rng: random.Random | None = None) -> None:
        self.session_id = session_id or str(uuid4())
        self._rng = rng if rng is not None else random.Random()
        self._twin = DigitalTwinKernel(rng=self._rng)
        self.state = self._twin.to_mecha_state(PersonalityMode.KAISER_CORE_MODE)

    def tick(self) -> MechaState:
        self.state = self._twin.step(1.2, self.state.mode)
        return self.state

    def set_mode(self, mode: PersonalityMode) -> MechaState:
        self.state = self._twin.to_mecha_state(mode)
        return self.state

    def run_diagnostics(self) -> MechaState:
        self.state = self._twin.run_diagnostics(self.state.mode)
        return self.state

    def trigger_move_demo(
        self,
        move: KaiserMove,
        *,
        pilot_authorized: bool = True,
        strict_safety: bool = True,
    ) -> MechaState:
        self.state = self._twin.execute_move(
            move,
            self.state.mode,
            pilot_authorized=pilot_authorized,
            strict_safety=strict_safety,
        )
        return self.state

    def apply_directive(self, directive: SimulationDirective) -> MechaState:
        self.state = self._twin.apply_simulation_directive(directive, self.state.mode)
        return self.state

    def twin_events(self, limit: int = 50) -> list[dict]:
        return self._twin.latest_events(limit)

    @property
    def last_move_batch(self) -> dict | None:
        return self._twin.last_batch_report

    @property
    def twin_snapshot(self) -> TwinSnapshot:
        """Authoritative numeric twin snapshot for cognition (instinct, advisors)."""

        return self._twin.snapshot

    def telemetry_read(self, *, advance_tick: bool) -> MechaState:
        """Projection suitable for HUD/REST polls; optionally advances idle regulation."""

        if advance_tick:
            self.state = self._twin.step(1.2, self.state.mode)
        else:
            self.state = self._twin.to_mecha_state(self.state.mode)
        return self.state

    def reset_twin_safe(self) -> MechaState:
        self.state = self._twin.reset_state_safe(self.state.mode)
        return self.state

    def pilder_dock(self, *, sync_boost_pct: float | None = None, recognize_pilot: bool = True) -> MechaState:
        self.state = self._twin.pilder_dock_sequence(
            self.state.mode,
            sync_boost_pct=sync_boost_pct,
            recognize_pilot=recognize_pilot,
        )
        return self.state

    def pilder_undock(self, *, emergency: bool = False) -> MechaState:
        self.state = self._twin.pilder_undock_sequence(self.state.mode, emergency=emergency)
        return self.state

    def pilot_sync_update(
        self,
        *,
        target_pilot_sync_pct: float | None = None,
        pilot_sync_delta_pct: float | None = None,
        stress_delta_pct: float | None = None,
        alleviate_stress: bool = False,
        initiate_safe_shutdown: bool = False,
        recognize_pilot: bool = False,
    ) -> MechaState:
        self.state = self._twin.pilot_sync_calibration(
            self.state.mode,
            target_pilot_sync_pct=target_pilot_sync_pct,
            pilot_sync_delta_pct=pilot_sync_delta_pct,
            stress_delta_pct=stress_delta_pct,
            alleviate_stress=alleviate_stress,
            initiate_safe_shutdown=initiate_safe_shutdown,
            recognize_pilot=recognize_pilot,
        )
        return self.state

    def apply_state_engine_event(
        self,
        event: TwinStateInputEvent,
        payload: dict[str, object],
    ) -> MechaState:
        self.state = self._twin.apply_state_input_event(event, payload, self.state.mode)
        return self.state


class StateEngine:
    """Registry of cockpit sessions (replace with Redis for horizontal scale)."""

    def __init__(self) -> None:
        self._sessions: dict[str, CockpitSession] = {}

    def get_or_create(self, session_id: str | None) -> CockpitSession:
        if session_id and session_id in self._sessions:
            return self._sessions[session_id]
        sess = CockpitSession(session_id)
        self._sessions[sess.session_id] = sess
        return sess
