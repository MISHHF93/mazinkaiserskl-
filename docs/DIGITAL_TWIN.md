# Digital twin simulation

Mazinkaiser exposes an **executable software twin**: powers, canonical moves, systemic directives, and idle regulation all run as deterministic logic over an internal `TwinSnapshot`, projected to HUD-facing `MechaState`.

## Cinematic physical scale

Canonical **presence-scale** chassis numbers (not a single anime continuity) live in **`mazinkaiser.domain.cinematic_scale`**: **`32 m`** height, **`280` metric tons**, Scrander **`52 m`** wingspan, Kaiser Blade **`22 m`**, etc. This profile is surfaced on **`GET /cockpit/state`**, **`MoveDemoResponse`** / **`MoveSimulationResponse`** / **`POST /pilot/sync`**, and the WebSocket **`welcome`** frame as **`cinematic_scale_profile`** for HUD, cockpit layout, bridges, and future inertia / collision models. Lore varies by source; see [Mechapedia — Mazinkaiser](https://mecha.fandom.com/wiki/Mazinkaiser_%28Mecha%29).

## Components

| Module | Responsibility |
|--------|----------------|
| `mazinkaiser/simulation/kernel.py` | `DigitalTwinKernel`: step clock, diagnostics, moves, directives, event log |
| `mazinkaiser/simulation/twin_snapshot.py` | Authoritative numeric twin state (photon/reactor/armor/heat/sync, Scrander, Pilder, ops posture, alerts, damage sim, Nova/overdrive meters) |
| `mazinkaiser/simulation/twin_validate.py` | Range clamps + string validators (all writes should pass through `clamp_snapshot_inplace`) |
| `mazinkaiser/simulation/twin_derived.py` | Derived movement / overdrive / Nova readiness + soft auto `CRITICAL_CORE` coupling |
| `mazinkaiser/simulation/state_input_events.py` | Validated `TwinStateInputEvent` fan-in for `/api/v1/state/event` |
| `mazinkaiser/simulation/subsystems.py` | Idle regulation (coolant, reactor drift, cooldown decay, structural relaxation) |
| `mazinkaiser/simulation/move_execution/` | **Move Execution Engine**: registry-backed 14-phase batch per canonical move (gates, VO, cinematic cues, telemetry mutation). |
| `mazinkaiser/simulation/moves_executable.py` | Legacy **direct** telemetry shim (skips batch); kernels use the engine instead. |
| `mazinkaiser/simulation/directives.py` | Non-combat power routing / maintenance directives |
| `mazinkaiser/simulation/projection.py` | `TwinSnapshot` → `MechaState` |
| `mazinkaiser/simulation/simulation_event.py` | Replay-friendly timeline events |

`CockpitSession` delegates all telemetry mutations to `DigitalTwinKernel`; API/WebSocket consumers keep using `/cockpit/state`.

## Move execution engine

Each **`KaiserMove`** runs through **`MoveExecutionEngine`** as a coordinated batch (~14 phases: authorization → safety → telemetry gates → tactical confirmation → cinematic/HUD cues → execution sim → state mutation → cooldown → voice line → log → post-action analysis). Definitions live in **`move_execution/registry_build.py`**; **`TwinEventKind.MOVE_BATCH`** captures the **`move_batch`** report on the timeline. **`POST /cockpit/move-demo`** returns the same **`move_batch`** alongside **`state`** for demos and tooling.

## APIs

- `GET /api/v1/cockpit/twin/events?session_id=&limit=` — tail of twin event log.
- `POST /api/v1/cockpit/twin/directive` — `{ "directive": "<SimulationDirective>", "session_id"? }` for tool/AI adjunct hooks.

## Extension

- Follow **`docs/PROMPT_PIPELINE.md`** (Phase 2) when adding Kaiser Instinct, photon-overflow/Nova, Pilder sync, extreme environments, or vulnerability tooling — extend **`TwinSnapshot`** + **`projection`** rather than splitting a competing state model (see **`backend/STRUCTURE.md`**).
- Plug **tool-calling** outputs into `SimulationDirective` or future structured `TwinCommand`s.
- Swap in **numerical integrators**, damage envelopes, or scenario scripts without changing HUD contracts.
