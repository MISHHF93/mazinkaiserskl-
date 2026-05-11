"""Tactical reasoning summaries (combines HUD state + optional tactical simulator)."""



from __future__ import annotations



from mazinkaiser.domain.mecha_state import MechaState

from mazinkaiser.services.tactical.simulation import TacticalSimulationService





def tactical_summary_lines(state: MechaState, tactical: TacticalSimulationService | None) -> str:

    chunks: list[str] = [

        f"HUD tactical alert «{state.tactical_alert}»; "

        f"movement_ready={state.movement_ready}; "

        f"photon {state.photon_power_pct:.1f}% / heat {state.heat_level_pct:.1f}% / sync {state.sync_rate_pct:.1f}%."

    ]

    if tactical is None:

        return " ".join(chunks)

    snap = tactical.snapshot()

    chunks.append(

        f"Notional battlefield: {snap.environment}. Priority defense posture (simulated): "

        f"{snap.recommended_defense[:240]}"

    )

    return " ".join(chunks)


