# Mazinkaiser AI — system canon (context lock)

This document **locks** product identity, architecture direction, personality, UX, simulation, moves, safety, and engineering standards as **canonical**. All implementation work MUST stay consistent with this file and with `docs/PROMPT_PIPELINE.md` (**Phase 2 systems architect orchestration chain**), `docs/ARCHITECTURE.md`, **`docs/ENGINEERING_SOURCE_OF_TRUTH.md`** (precedence when docs overlap), and `docs/AI_GOVERNANCE.md`.

## What Mazinkaiser AI is (and is not)

**Is:** modular AI operating system, cinematic cockpit, tactical/simulation substrate, conversational mecha companion, future robotics/simulation architecture (software-first).

**Is not:** a generic chatbot, toy demo-only app, or detached “assistant” with no cockpit/tactical/context.

## Persistent rules

| Rule | Requirement |
|------|--------------|
| **Software-first** | No real-world weaponization. Combat is simulated, cinematic, educational, or entertainment. |
| **Safety-first** | Reject harmful/unsafe-real-world robotics requests; prioritize humans; audit + explain refusal paths where applicable. |
| **Modular-first** | Services, adapters, APIs separated; avoid tight coupling; extension points over monolith logic. |
| **Real-time ready** | Stream-friendly design: WebSockets, events, HUD/avatar sync, future voice streaming. |
| **Incremental Mutation (Phase 2)** | Prefer editing existing modules, additive schemas, and backward-compatible APIs unless an explicit versioning step is documented. Never “restart the architecture” mid-chain. Cursor rule: `.cursor/rules/mazinkaiser-orchestration-phase2.mdc`. |

## Architecture lock (stack)

| Layer | Canon |
|------|--------|
| **Backend** | FastAPI, async-first, modular services, state engine, AI orchestration, memory, voice façade, WS, telemetry hooks, safety governor. |
| **Frontend** | React, TypeScript, Tailwind, Framer Motion — cockpit HUD, avatar viewport, cinematic interaction, streaming-friendly UI. |
| **AI layer** | Provider-agnostic routing, personality + mode-aware context, memory-aware turns, tactical/simulation-aware phrasing where appropriate. |

## Personality lock

**Tone:** intelligent, tactical, calm, cinematic, protective, analytical, emotionally controlled — like a cockpit supercomputer and trusted guardian OS.

**Avoid:** meme-y, childish, or generic-chatbot filler.

Concrete behavior is reinforced in persona prompts (`mazinkaiser.services.ai.prompts`); keep edits aligned with this canon.

## UI/UX lock

**Feel:** stepping into a mecha cockpit / advanced command harness; operating a capable machine with a distinct AI presence.

**Look:** cinematic sci-fi, high-tech, immersive, anime-mecha-inspired, minimal but powerful.

## State & simulation lock

Simulated systems include (non-exhaustive): Photon Power, Sync Rate, Armor Integrity, Heat, Tactical state, Movement readiness, Reactor output, Cooldowns, Energy — **telemetry must evolve over time** (ticks, demos, diagnostics), not remain static placeholders.

## Move system lock (canonical demos)

Rocket Punch · Turbo Smasher Punch · Rust Tornado · Fire Blaster · Koshiryoku Beam · Kaiser Blade · Final Kaiser Blade · Kaiser Nova — **visual/simulated/event-driven**, extensible registry. Additional lore-aligned arsenal and defensive techniques (examples: Glacial Beam, Giganto Missile, Shoulder Slicers, Scrander Boomerang depth, Dynamite Tackle, Kaiser Knuckle, Jet Boomerang) land **through the move registry/batch pipeline** (`docs/PROMPT_PIPELINE.md`, Prompt **4**) without one-off cheats.

### Phase 2 deep systems canon (planned coverage)

Twin and narrative systems MUST eventually cover: **autonomous combat instinct / pilot sync stress**, **photon overflow and Nova envelopes**, **Pilder separation & cockpit coupling**, **extreme environments** (re-entry, volcano emergence, urban devastation physics-lite), **strategic vulnerabilities** (Scrander blind zones, berserk/over-sync risk self-diagnosis). Reference matrix: **`docs/PROMPT_PIPELINE.md`** (canonical capability backlog table).

## Future expansion lock

Design seams for: Live2D/3D avatar pipelines, UE/Unity/sim bridges, ROS2/Gazebo/Webots, digital twins, local inference, richer agents — without breaking the core domain model.

## Engineering & governance alignment (conceptual)

Align with governance/security quality thinking consistent with ISO/IEC 42001 / 27001 / 25010 / 27017 / risk management framing, **NIST AI RMF**, and **OWASP** secure habits: observability, auditability, resilience, responsible deployment.

Implementation detail lives in code (logging, health, audit log path, safety governor), not duplicated here.

---

**Change control:** Editing this canon should be deliberate (product/architecture decision). Routine features should conform; do not “drift” the product into a thin chat wrapper.
