# SKL Cove move artifacts (frontend)

This repo ships a **Cove-style** JSON bundle that **resonates** (maps) backend move semantics + glTF clip names without redeploying TypeScript for every Blender export.

## Files

| Path | Role |
|------|------|
| `frontend/public/artifacts/mazinkaiser-move-artifacts.cove.json` | Default bundle served at `/artifacts/mazinkaiser-move-artifacts.cove.json` |
| `frontend/src/avatar/view/sklArtifactCove.ts` | Fetch + apply at hull viewer startup |
| `frontend/src/avatar/view/sklClipMapping.ts` | Runtime registries merged into `resolveSklClipForCue` + idle fallback |

Override URL:

```bash
# .env.local
VITE_SKL_ARTIFACTS_URL=https://your.cdn/mazinkaiser-move-artifacts.cove.json
```

## JSON schema (v1)

- **`version`**: must be `1`.
- **`craftsman`**: human metadata (rig label, exporter tool, notes) — **not** executed; useful for ML/export provenance.
- **`clipAliases`**: map **lowercase key** → **exact** `AnimationClip.name` inside the GLB. Keys may be `move_id` (`rocket-punch`) or a derived logical name (`rocket-punch-charge`) after template expansion.
- **`idleClipCandidates`**: extra names tried **before** built-in `IDLE_CLIP_CANDIDATES` when returning to idle.
- **`cueResonance`**: optional ordered patterns `{ hudEventIncludes, clipTemplate, order }`. `clipTemplate` supports `{slug}` placeholder. When this array is **present** (including empty), it replaces the built-in cue table: use `[]` to force legacy heuristics only.
- **`batches`**: ordered `move_id` lists for **authoring / ML batch compilation** — metadata only today; execution still follows REST `animation_plan` per move.

## How this connects to the backend

No change to Kaiser Core contracts:

1. **Move execution** still sends `animation_plan` (`AnimationCueWire`) over REST/WS; `App.tsx` builds `SklMovePlaybackSnapshot`.
2. **`SklMoveAnimationPlayback`** picks a clip name via **`resolveSklClipForCue`** using the **same** cue timing as the HUD.
3. The Cove file teaches the mixer **which glTF clip string** matches each cue for a given `move_id`/phase.

Until the GLB exports **`animations[]`**, the mixer remains a no-op — see **`docs/SKL_GLB_ANIMATION_AND_BACKEND_BRIDGE.md`**.

## ML / export pipeline (practical)

1. Train or curate a mapping from REST `move_id` + cue phase → target clip name.
2. Emit **`clipAliases`** (+ optional **`cueResonance`**) into `mazinkaiser-move-artifacts.cove.json`.
3. Deploy the JSON next to the SPA or serve via `VITE_SKL_ARTIFACTS_URL`.
4. Re-export the GLB with matching **`AnimationClip.name`** values.

## Related

- Runtime bridge: `docs/SKL_GLB_ANIMATION_AND_BACKEND_BRIDGE.md`
- Cue naming table: `frontend/src/avatar/view/sklClipMapping.ts`
