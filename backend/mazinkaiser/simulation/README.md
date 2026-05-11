# Simulation / digital twin

This package is the **executable Mazinkaiser twin**: regulatory subsystems, move physics (simulated), directives, projections to `MechaState`, and a bounded event log for replay/UI.

Legacy note: cockpit wiring lives in `mazinkaiser.services.state_engine.CockpitSession`, which owns one `DigitalTwinKernel` per session.

See `docs/DIGITAL_TWIN.md`.
