# Business requirements document — Mazinkaiser AI

## Vision

Deliver a **software-first**, immersive cockpit experience: an intelligent mecha-oriented companion that blends conversational AI, simulated telemetry, tactical context, cinematic move demonstrations, and responsible safety governance—aligned with **`docs/SYSTEM_CANON.md`**.

## Goals

| ID | Requirement | Success signal |
|----|-------------|----------------|
| G1 | **Conversational command** — natural language cockpit interaction with persona-consistent replies | REST chat path + optional streamed UX |
| G2 | **Live HUD coherence** — telemetry that updates over ticks, demos, and diagnostics | `MechaState` reflects twin/kernel changes |
| G3 | **Simulation discipline** — moves and combat remain **simulated / cinematic**, not real-world harm | Safety governor + canon copy |
| G4 | **Extensibility** — modular services for LLM providers, persistence, twins, bridges | Stable domain + API seams |
| G5 | **Operability** — health checks, structured logs, auditable governance events | `/health/*`, audit log hooks |

## Stakeholders (conceptual)

- **Pilot / user** — immersive cockpit, understandable feedback, refusal explanations when needed.
- **Operator** — deployable backend, observable logs, readiness probes.
- **Product/architecture** — incremental Phase 2 systems per **`docs/PROMPT_PIPELINE.md`**.

## In scope (MVP+)

- FastAPI REST + WebSocket cockpit session.
- React + TypeScript cockpit UI (HUD, avatar viewport, moves, voice input path).
- State engine backing session + **`DigitalTwinKernel`** simulation.
- Move execution batch registry and demo endpoint.
- OpenAI-compatible LLM integration with deterministic **offline stub** when unset.

## Out of scope (current phase)

- Real robotics control, autonomous weapons, or unlawful dual-use facilitation.
- Full multiplayer sync, ROS2/UE bridges (**documented stubs** toward Prompt 10 only).

## Non-functional requirements

- **Safety & ethics** — `docs/AI_GOVERNANCE.md` alignment; refusal with audit trail where applicable.
- **Performance** — sub-second REST for chat stub path; WebSocket suitable for cockpit tick updates.
- **Compatibility** — **API versioning** under `/api/v1`; additive schema changes preferred.

## Traceability

- Architecture: **`docs/ARCHITECTURE.md`**
- Technical detail: **`docs/TECH_SPEC.md`**
- Public HTTP: **`docs/API.md`**
- Locked identity: **`docs/SYSTEM_CANON.md`**
