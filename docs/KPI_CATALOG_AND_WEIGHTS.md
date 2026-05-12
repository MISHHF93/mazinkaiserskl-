# KPI catalog and weights

This document **names every KPI class** used to judge Mazinkaiser AI health, assigns **weights for prioritization** (not financial targets), and ties each to **evidence** (docs, tests, exports). Use it for release triage, CI policy, and artifact publish review.

**Weights below are relative priorities (0–1 within each tier).** They sum to **1.0** per tier so you can compute a weighted score if desired.

---

## Tier A — Product outcomes (BRD goals)

Source: **`docs/BRD.md`** (G1–G5).

| ID | KPI | Weight | Success signal (evidence) |
|----|-----|--------|----------------------------|
| G1 | Conversational command | **0.22** | Chat REST path works; persona-consistent replies; optional stream UX |
| G2 | Live HUD coherence | **0.26** | `MechaState` / HUD reflects twin and session updates; WS telemetry path |
| G3 | Simulation discipline | **0.24** | Safety governor + refusal paths; no “real harm” semantics (**highest ethical bar**) |
| G4 | Extensibility | **0.16** | Stable domain + API seams; additive schemas preferred |
| G5 | Operability | **0.12** | `/health/live`, `/health/ready`; structured logs; audit hooks |

**Tier A sum:** 1.00  

**Notes:** G2 and G3 are weighted highest because the product is a **cockpit simulator** with **governed simulation** — incoherent HUD or weak safety undermines everything else.

---

## Tier B — Engineering and quality gates

Sources: **`docs/TESTING.md`**, **`docs/PROMPT_PIPELINE.md`** (cadence), **`README.md`** (standards mapping), **`docs/ENGINEERING_SOURCE_OF_TRUTH.md`**.

| KPI | Weight | Gate / evidence |
|-----|--------|-------------------|
| Backend test suite green | **0.28** | `cd backend && pytest` |
| Frontend build green | **0.28** | `cd frontend && npm run build` (`tsc` + Vite) |
| API contract stability | **0.18** | Versioned `/api/v1`; Pydantic + shared-types alignment; contract tests (e.g. move-demo batch) |
| WebSocket ingress robustness | **0.14** | Zod / coercion paths; no silent wrong-shape HUD |
| Readiness probes | **0.12** | `/health/ready` in deploy contexts |

**Tier B sum:** 1.00  

**Notes:** Treat Tier B as **hard gates** for merge: a failing gate overrides a high Tier A narrative score.

---

## Tier C — Observability and governance (conceptual ISO mapping)

Source: **`README.md`** (standards table), **`docs/AI_GOVERNANCE.md`**.

| KPI | Weight | Evidence |
|-----|--------|----------|
| Traceability (request / trace ids) | **0.26** | `X-Request-ID`, WS `trace_id`, `cockpitTraceStore` |
| AI governance alignment | **0.24** | Audit events, risk labels, refusal logging |
| Security posture (ingress) | **0.22** | ASVS-oriented patterns; no stack traces to clients |
| Maintainability / modularity | **0.18** | `ARCHITECTURE` + `backend/STRUCTURE` boundaries respected |
| Resilience (degraded modes) | **0.10** | Stub LLM, optional WS disable, GLB-absent fixture paths |

**Tier C sum:** 1.00  

---

## Tier D — SKL publish / artifact resonance (hull × Cove × optional ML)

Source: **`mazinkaiser-artifacts-resonance.csv`** (generated), **`backend/mazinkaiser/services/artifacts/resonance.py`**, **`docs/SKL_MOVE_ARTIFACTS_COVE.md`**, **`docs/SKL_GLB_ANIMATION_AND_BACKEND_BRIDGE.md`**.

These KPIs judge **how well logical move catalogues align with the primary GLB** and whether playback is blocked by missing clips.

| KPI (CSV / report field) | Weight | Meaning |
|--------------------------|--------|---------|
| `merged_resonance` | **0.28** | **`max(heuristic, ml_rf)`** in `hybrid_rf` mode — primary **per-move** quality score |
| `heuristic_resonance` | **0.18** | Slug / cue / topology heuristic agreement |
| `ml_rf_resonance` | **0.12** | Optional sklearn regressor score (0 if sklearn absent) |
| `hull_inspect_nodes_consistent` | **0.14** | Binary: inspector node count aligns with publish bundle expectations |
| `gltf_animation_clips_count` | **0.12** | Readiness for **visible** clip playback (0 = OK but idle mesh) |
| `inspect_playback_blocked` | **0.10** | **`yes`** when clips missing / mapping blocks expected playback — track trend toward **`no`** |
| `clip_alias_defined` | **0.06** | Whether explicit alias exists for that slug in Cove / mapping |

**Tier D sum:** 1.00  

**Notes:** Until the GLB exports `animations[]`, expect **`gltf_animation_clips_count = 0`** and **`inspect_playback_blocked = yes`** — that is an **asset gap**, not necessarily a logic failure. Weight **`merged_resonance`** and **consistency** higher than raw clip count until clips ship.

---

## Tier E — RF feature vector (diagnostics, not a user-facing composite)

Source: **`_RF_FEATURE_NAMES`** in `resonance.py` (12 dimensions).

These are **model inputs**, not separate product KPIs. Use them only for **debugging** the resonance monitor or retraining:

`cue_phase_normalized`, `template_expansion_length_norm`, `unified_catalog_nonempty`, `unified_catalog_size_norm`, `gltf_clips_present`, `gltf_clip_count_norm`, `hull_node_count_norm`, `gltf_anim_decl_norm`, `skin_bound_nodes_norm`, `mesh_bound_nodes_norm`, `inspect_playback_blocked_flag`, `pseudo_clip_resonance_label`.

Do **not** add arbitrary weights here into Tier D without updating **`resonance.py`** training labels and tests.

---

## Composite score (optional)

If you need a single number for a dashboard:

\[
S = 0.35\,A^{*} + 0.30\,B^{*} + 0.15\,C^{*} + 0.20\,D^{*}
\]

where \(A^{*}\), \(B^{*}\), \(C^{*}\), \(D^{*}\) are each tier’s weighted average in \([0,1]\), and **\(B^{*} = 0\)** if any Tier B hard gate fails (forces \(S\) low).

Adjust coefficients with product leadership; defaults favor **ship gates** (B) and **product goals** (A).

---

## Traceability

| Artifact | Role |
|----------|------|
| **`docs/BRD.md`** | Tier A definitions |
| **`docs/KPI_CATALOG_AND_WEIGHTS.md`** | This file — weighting policy |
| **`docs/ENGINEERING_SOURCE_OF_TRUTH.md`** | Doc/code index |
| **`mazinkaiser-artifacts-resonance.csv`** | Tier D row export |

When KPIs conflict (e.g. high resonance but failing pytest), **Tier B wins** until fixed.
