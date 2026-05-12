# Engineering source of truth — docs + pipelines + code

## Why this file exists

Work may come from multiple AI sessions, local Cursor plans, or branches. **When instructions collide, resolve conflicts using the precedence order below**, then update **one** canonical doc or module—do not fork parallel “truths” in comments or duplicate specs.

## Precedence (highest wins on conflict)

1. **`docs/SYSTEM_CANON.md`** — product identity, simulation posture, move canon, safety, change control  
2. **`docs/PROMPT_PIPELINE.md`** — Phase 2 orchestration chain and incremental-refactor discipline  
3. **`docs/ARCHITECTURE.md`** — system shape, REST/WS seams, twin projection, viewer pipeline  
4. **`backend/STRUCTURE.md`** — Python package layout and where services live  
5. **`docs/API.md`**, **`docs/CONFIGURATION.md`**, **`docs/TESTING.md`**, **`docs/DEPLOYMENT.md`** — contracts, env, QA gates, ship notes  
6. **Feature deep-dives** (table below) — add detail; they must not silently contradict 1–5  

## Topic → authoritative doc(s) → primary code

| Topic | Authoritative docs | Primary code (start here) |
|--------|-------------------|---------------------------|
| Phase 2 prompt chain & backlog | `PROMPT_PIPELINE.md` | N/A (process); implements land under `backend/` + `frontend/` per prompt |
| Product / safety / move canon | `SYSTEM_CANON.md`, `BRD.md` | `backend/mazinkaiser/domain/`, safety governor, API routers |
| Twin + move batch semantics | `DIGITAL_TWIN.md`, `ARCHITECTURE.md` | `backend/mazinkaiser/simulation/`, `move_execution/` |
| REST + WS contracts | `API.md` | `backend/mazinkaiser/api/`, `packages/shared-types/` |
| Browser cockpit + hull | `ARCHITECTURE.md`, `CINEMATIC_AVATAR.md` | `frontend/src/App.tsx`, `components/cockpit/`, `hooks/useCockpitWs.ts` |
| **SKL GLB load + sync** | `ARCHITECTURE.md` (GLB asset pipeline), `SKL_GLB_ANIMATION_AND_BACKEND_BRIDGE.md` | `frontend/scripts/sync-mazinkaiser-skl-glb.mjs`, `avatar/view/resolveSklModelUrl.ts`, `avatar/constants.ts` |
| **`animation_plan` → 3D clips** | `SKL_GLB_ANIMATION_AND_BACKEND_BRIDGE.md` | `App.tsx`, `avatar/presentation/moveVisualMap.ts`, `avatar/view/SklMoveAnimationPlayback.tsx`, `sklClipMapping.ts` |
| Artifacts Cove / resonance monitor | `SKL_MOVE_ARTIFACTS_COVE.md` | `avatar/view/sklArtifactCove.ts`, `sklClipMapping.ts`, `backend/mazinkaiser/services/artifacts/` |
| GLB structural inspector (CPU parse) | `SKL_GLB_ANIMATION_AND_BACKEND_BRIDGE.md` (context) | `avatar/view/MazinkaiserGlbInspector.tsx`, `avatar/glb/summarizeGltf.ts` |
| Cockpit HUD information architecture | **`COCKPIT_HUD_LAYOUT.md`** (repo root) | `HullInstrumentOverlay.tsx`, `CinematicCockpit.tsx`, `SKLModelViewer.tsx` |
| AI governance / audit | `AI_GOVERNANCE.md` | `backend/mazinkaiser/services/ai/`, shared governance types |
| Deploy / env | `DEPLOYMENT.md`, `CONFIGURATION.md` | `infra/`, `backend/.env.example`, `frontend/.env.example` |
| **KPIs & weighted scorecard** | **`KPI_CATALOG_AND_WEIGHTS.md`**, `BRD.md`, `TESTING.md` | Resonance: `mazinkaiser-artifacts-resonance.csv`; gates: CI / health |

## Pipelines (end-to-end, single mental model)

**Move demo / remote move → HUD + SKL**

1. Backend: `MoveDefinition` / engine → `move_batch` + `animation_plan` on REST or WS.  
2. Frontend: `App.tsx` normalizes plan, holds `moveLayer`, builds `SklMovePlaybackSnapshot`.  
3. `CinematicCockpit` → `ImageAvatarViewer` → `SKLModelViewer` → `SklMoveAnimationPlayback` + `sklClipMapping`.  
4. If GLB has **no** `animations[]`, playback is a no-op; HUD still follows logical cues — see **`SKL_GLB_ANIMATION_AND_BACKEND_BRIDGE.md`**.

**GLB file → browser**

1. `mazinkaiser_skl.glb` at repo root → `npm run dev` / `prebuild` sync → `frontend/public/models/`.  
2. Viewer URL resolution + optional CPU inspector parse — **`ARCHITECTURE.md`** (GLB asset pipeline).

## Quality gates (after substantive edits)

- Python: `cd backend && pytest` (see `docs/TESTING.md`)  
- Frontend: `cd frontend && npm run build`  
- Health: `/health/ready` when touching runtime wiring  

## Plans and chat exports

- **Cursor plan files** (e.g. under a user profile `.cursor/plans/`) are **not** versioned in this repo until their content is reflected in **`docs/`** or code.  
- **This file + `SYSTEM_CANON` + `PROMPT_PIPELINE` + `ARCHITECTURE`** are the merge targets for any “implement the plan” work.

## Related entry points

- Repository overview and diagram: **`README.md`**  
- Cursor workspace rule: **`.cursor/rules/mazinkaiser-orchestration-phase2.mdc`**  
- **KPI catalog and weighted priorities:** **`docs/KPI_CATALOG_AND_WEIGHTS.md`**  
