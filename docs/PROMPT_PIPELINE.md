# Mazinkaiser AI — Phase 2 systems architect orchestration chain

Active engineering is driven by **10 sequenced prompts** below. Earlier repo history used a **scaffold-phase** ordering (FOUNDATION→…→Production); treat that as superseded **for ongoing feature work**, except where prompts still reuse stable seams (REST, WS, state engine).

Each prompt MUST:

| Discipline |
|-------------|
| 1. Update existing modules (avoid greenfield rewires). |
| 2. Extend architecture with clear seams and contracts. |
| 3. Preserve prior context (`SYSTEM_CANON`, API shapes, HUD contracts unless versioned). |
| 4. Improve systems iteratively (tests green after each increment). |
| 5. Research missing Mazinkaiser-related / SRW-variant capabilities via reputable sources ([Mazinger Wiki][mazinger-wiki], [Wikipedia — Mazinkaiser][wikipedia-mz], [Mechapedia][mechapedia]). |
| 6. Continuously harden production quality (logging, typing, refusal paths, compatibility). |

## Mandatory footer for every Cursor prompt in this phase

Paste this verbatim at the **end** of each implementation prompt:

```markdown
IMPORTANT:
- Update existing modules instead of rebuilding from scratch.
- Preserve architectural consistency.
- Maintain backward compatibility.
- Reuse existing services and abstractions.
- Expand the current system incrementally.
- Use internet research to improve implementation quality.
- Prefer official documentation and production-grade patterns.
```

(This is also enforced via **`.cursor/rules/mazinkaiser-orchestration-phase2.mdc`**.)

## Canonical capability backlog (lore-aligned)

Statuses refer to simulation / twin / cockpit coverage in **this codebase**, not IP ownership.

| Feature | Target status | Primary prompt |
|--------|----------------|----------------|
| Glacial Beam | NEW | Prompt 4 |
| Giganto Missile | NEW | Prompt 4 |
| Shoulder Slicers | NEW | Prompt 4 |
| Scrander Boomerang | EXPANDED | Prompt 4 / 9 |
| Dynamite Tackle | NEW | Prompt 4 |
| Kaiser Knuckle | NEW | Prompt 4 |
| Jet Boomerang | NEW | Prompt 4 |
| Adaptive berserk potential | IMPORTANT | Prompt 2 / 3 |
| Pilder separation logic | NEW | Prompt 5 |
| Atmospheric reentry logic | NEW | Prompt 6 |
| Volcano emergence cinematics | NEW | Prompt 6 / 7 |
| Blind spot / Scrander weakness simulation | NEW | Prompt 9 |
| Autonomous combat instinct | IMPORTANT | Prompt 2 |
| Overwhelming photon overflow / Nova | IMPORTANT | Prompt 3 |
| AI / pilot mental synchronization | EXPANDED | Prompt 2 / 5 / 8 |

## New systems to land (architecture names)

Implement **incrementally** under `backend/mazinkaiser/simulation/` (and façade APIs) unless a clearer seam exists:

| Name | Responsibility |
|------|----------------|
| **Kaiser Instinct Engine** | Predictive reactions, autonomous tactical hints, emotional sync amplification, berserk risk, pilot stress coupling. |
| **Photon Overflow Reactor System (“Nova”)** | Overdrive thresholds, instability, Nova prep (`OVERDRIVE`, `NOVA_PREP`, `CRITICAL_CORE`), containment, catastrophic envelopes, emergency ejection hooks. |
| **Pilot Docking & Pilder Synchronization System** | Dock / separate / independent flight / reconnect, cockpit telemetry deltas. |
| **Extreme Environment Simulation Layer** | Modes `SPACE`, `VOLCANIC`, `OCEANIC`, `URBAN`, `ATMOSPHERIC`, `UNDERGROUND` + gravity, weather-lite, terrain interaction. |
| **Strategic Vulnerability Engine** | Self-diagnose weak points (Scrander blind spots, sync overload), tactics, repairs, overheating mitigation, adaptive defenses. |

## Prompt 1 — Foundation lock & architecture refresh

Goals: reconcile docs, **`backend/STRUCTURE.md`**, and **`ARCHITECTURE.md`** with Phase 2; define module slots; forbid destructive rewrites; keep APIs backward compatible unless explicitly versioned.

## Prompt 2 — Kaiser core cognitive / instinct stack

Goals: **`Kaiser Instinct Engine`**; emotional synchronization; tactical personality adaptation; pilot compatibility modeling; tie-ins to orchestrator + twin snapshot fields (additive schemas).

## Prompt 3 — Photon reactor + Nova

Goals: **`Photon Overflow Reactor System`**; instability + containment modeling; enumerated states **`OVERDRIVE`**, **`NOVA_PREP`**, **`CRITICAL_CORE`**; emergency protocols projecting to HUD.

## Prompt 4 — Move execution batch engine (massive alignment)

Every move’s batch MUST eventually cover (additive to today’s pipeline): **validation**, **telemetry**, **physics**, **energy**, **animation**, **voice**, **cooldown**, **learning** (optional hooks), **tactical metadata**, **environmental interaction**.

Goals: deepen `move_execution` / registry for the above; extend registry with **Glacial Beam, Giganto Missile, Shoulder Slicers, Dynamite Tackle, Kaiser Knuckle, Jet Boomerang** alongside existing Kaiser moves.

## Prompt 5 — Pilder / pilot synchronization

Goals: **`Kaiser Pilder System`**; docking/separation/sync levels; cockpit telemetry updates; pilot stress interplay with Prompt 2; emergency ejection.

## Prompt 6 — Extreme environments

Goals: **`Extreme Environment Simulation Layer`** (re-entry, volcano emergence, urban destruction-lite, gravity, weather-lite, terrain); honor canon inspiration ([Wikipedia summary][wikipedia-mz]). Keep deterministic-friendly simulation bounds.

## Prompt 7 — Avatar + cinematic cockpit

Goals: “Full cinematic command center” — battle overlays, emergency lighting, holographic HUD affordances (API + UI stubs over time), cinematic move transitions coordinating with **`move_batch`**.

## Prompt 8 — Voice AI + tactical conversation

Goals: tactical reasoning, diagnostics explanations, strategic recommendations; emotional/register shifts; VO templates keyed off twin posture (Nova risk, instability, sync drift).

## Prompt 9 — Strategic vulnerability & self-repair

Goals: **`Strategic Vulnerability Engine`**; Scrander blind spot modeling; overheating/sync mitigation narratives; actionable repair/defense directives.

## Prompt 10 — Ultimate productionization & bridges

Goals: document and stub **interfaces** for **Unreal Engine** bridge, **ROS2** hooks, **WebGL** rendering, **local AI inference**, digital twin ingest, **Live2D / 3D** avatars, GPU inference scaling notes, **multiplayer synchronization**, future robotics abstraction — **without** ripping MVP paths; prefer adapter contracts + feature flags.

## Cadence & quality gate

Each prompt should conclude with mergeable increments: **`pytest`** green, **`npm run build`** green, **`/health/ready`** green, changelog-style note in docs if API contracts broaden.

[mazinger-wiki]: https://mazinger.fandom.com/wiki/Mazinkaiser_%28Robot%29/Kaiser "Mazinger Wiki — Kaiser"
[wikipedia-mz]: https://en.wikipedia.org/wiki/Mazinkaiser "Wikipedia — Mazinkaiser"
[mechapedia]: https://mecha.fandom.com/wiki/Mazinkaiser_%28Mecha%29 "Mechapedia — Mazinkaiser (mecha)"

---

## Appendix — scaffold-phase heritage (historical ordering)

Earlier repo scaffolding used:

```text
FOUNDATION → AI CORE → STATE ENGINE → VOICE → UI → AVATAR → SIMULATION
```

numbered Prompts **1–10** for repository layout, Kaiser core orchestration, mecha state/voice/UI/avatar/memory/WS/safety/hardening. **Phase 2** above refines and extends architecture for lore-depth systems **without deleting** completed seams; reconcile both by migrating features forward through numbered prompts above.
