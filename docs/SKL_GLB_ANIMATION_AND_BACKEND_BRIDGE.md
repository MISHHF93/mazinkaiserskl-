# Mazinkaiser SKL GLB ↔ backend / cockpit animation bridge

## What `mazinkaiser_skl.glb` actually contains

From `npm run inspect:glb` on the repository-root file (Sketchfab export):

| Asset fact | Value |
|------------|--------|
| **glTF animations** | **0** — there are **no** named clips in `animations[]` |
| **Skins / rig** | **1** — full humanoid-style hierarchy (Hip → spine → arms → fingers, etc.) |
| **Meshes** | 10 (segmented body + logo, etc.) |
| **Nodes** | 88 |

So **`useGLTF` / THREE** will report **`animations: []`**. Any “robot move” you see in the cockpit today is **not** driven by GLB clip playback on this file.

## Rig overview (for future clip authoring or procedural poses)

Typical joint prefixes in the node tree:

- **Core**: `Hip_*`, `Spine*`, `Neck_*`, `Head_*`
- **Legs**: `LegJoint.L/R`, `UpperLeg`, `LowerLeg`, `Foot`
- **Arms**: `Shoulder`, `UpperArm*`, `LowerArm`, `ArmJoint`, `Hand`
- **Fingers**: `FingerA–E` chains per hand
- **Attachments**: `Pilder_*`, `BreastTrigger`, `BTHandle`, armor nodes

When you **re-export with actions**, prefer clip names that match **move slugs** (kebab-case) from the API for traceability, e.g. `rocket-punch`, `kaiser-blade`.

## What the backend calls “animation”

`AnimationCue` entries are **logical timeline events** for HUD / avatar / voice coordination, **not** glTF clip names.

Defined in `backend/mazinkaiser/simulation/move_execution/registry_build.py` via `_cues(move_id)`:

| Phase | Example `hud_event` | Role |
|--------|----------------------|------|
| authorize | `hud.command.arm_switch` | Arming / consent beat |
| prep | `avatar.system.phase_charge` | Wind-up / charging (warn severity) |
| release | `avatar.anim.execution_burst` | Main “strike” beat (often critical) |
| recoil | `hud.telemetry.recoil_shockwave` | Aftershock / telemetry |
| cooling_hint | `hud.actor.cooldown_ribbon` | Post-move UI hint |

Payloads include `{"move": "<internal_id>"}` (e.g. `rocket_punch`, `turbo_smasher`). Those IDs align with **move definitions**, not bones.

Catalogue of player-facing moves: `backend/mazinkaiser/domain/moves.py` (`KaiserMove`).

## Frontend SKL clip playback (cockpit)

The hull viewer wires backend timelines into `THREE.AnimationMixer` **without requiring clips in the bundled GLB yet**:

1. **`animation_plan`** from REST / websocket batches is normalized to `AnimationPlanCueWire[]` and stored on `AvatarRuntimeCues.move.animationPlan` (`normalizeAnimationPlan` in `frontend/src/avatar/presentation/moveVisualMap.ts`).
2. **`App.tsx`** derives a **`SklMovePlaybackSnapshot`** from **`moveLayer`** (`phase`, `backendMoveId`, `animationPlan`, `executingStartedAtMs`). **`executingStartedAtMs`** is set to **`performance.now()`** when the move enters **`executing`** (REST demo + websocket batches); other phases clear or retain fields per move state updates.
3. That snapshot is threaded **`CinematicCockpit` → `ImageAvatarViewer` → `SKLModelViewer` → `SklMoveAnimationPlayback`** (inside the R3F canvas).
4. **`SklMoveAnimationPlayback`** (`frontend/src/avatar/view/SklMoveAnimationPlayback.tsx`) attaches the mixer to the same **`group`** that wraps **`HullDeckAlign`** — skeleton motion only; orbit pivot / deck alignment are unchanged.
5. While **`phase === 'executing'`**, the active cue is chosen by walking **`duration_ms`** in order vs elapsed time since **`executingStartedAtMs`**. Clips are resolved through **`sklClipMapping.ts`** and cross-faded (~0.28s).
6. When **`phase`** is not **`executing`** (idle, charging, cooldown) or there is no executing anchor, the viewer targets an **`idle`** clip if one exists (**`IDLE_CLIP_CANDIDATES`**), otherwise leaves the last pose (no forced reset).
7. If **`gltf.animations.length === 0`**: mixer stays off; one-shot **`console.info`** in dev; **Model debug** reports **`0 clips — playback idle`**.

### Clip naming ↔ backend (`sklClipMapping.ts`)

| Backend hint | Resolved clip name pattern (when slug = REST `move_id`) |
|--------------|---------------------------------------------------------|
| `avatar.anim.execution_burst` (and similar) | `{slug}` or **`MOVE_SLUG_CLIP_ALIASES[slug]`** |
| `avatar.system.phase_charge` | `{slug}-charge` |
| `hud.command.arm_switch` | `{slug}-arm` |
| `hud.telemetry.recoil_shockwave` | `{slug}-recoil` |
| `hud.actor.cooldown_ribbon` | `{slug}-cooldown` |

Unknown cues resolve to **no clip** for that frame (previous action / idle policy applies). Unit tests: **`frontend/src/avatar/view/sklClipMapping.test.ts`**.

### Authoring checklist (ship visible motion)

- [ ] Re-export GLB with **`animations[]`** populated; **`npm run inspect:glb`** reports **`animations=N`** with **N > 0**.
- [ ] Prefer **execution** clip name **equal to REST `move_id`** (kebab-case), e.g. `rocket-punch`.
- [ ] Optional segmented clips for cue phases: `{slug}-charge`, `{slug}-arm`, `{slug}-recoil`, `{slug}-cooldown` per table above (or extend **`resolveSklClipForCue`** / aliases).
- [ ] Add an **idle** clip using one of **`IDLE_CLIP_CANDIDATES`** (`idle`, `TPose`, …) for clean return between moves.
- [ ] If Blender action names differ from slugs, register them in **`MOVE_SLUG_CLIP_ALIASES`** in **`sklClipMapping.ts`**.

## Frontend “move visuals”

`frontend/src/avatar/presentation/moveVisualMap.ts` maps **REST move slugs** → **`MoveVisualKind`** (`thruster`, `melee`, `beam`, `blade`, `nova`, `field`, `thermal`, `neutral`). That drives **2D/cockpit presentation** (semantic, overlays), not GLB `AnimationMixer` clips.

## Practical mapping

| Layer | What you can map today |
|--------|-------------------------|
| **GLB** | Mesh + material + bind-pose skeleton; **animations[]** optional until re-export |
| **Backend** | `KaiserMove` + `AnimationCue.hud_event` phases + **`animation_plan`** timing |
| **Frontend** | `MoveVisualKind` + HUD / presentation + **SKL `AnimationMixer`** driven by **`SklMovePlaybackSnapshot`** + **`sklClipMapping`** |

## Next steps if you want true 3D move playback

1. **Author animations** in Blender (or source tool) **per move** as a shared state machine; export glTF/GLB with **`animations[]` populated** and **meaningful names** (see checklist above).
2. The viewer **`SklMoveAnimationPlayback`** already runs **`AnimationMixer`** on the hull root; ensure clip names match **`sklClipMapping`** (slug + cue rules) or **`MOVE_SLUG_CLIP_ALIASES`**.
3. Timing follows the same **`animation_plan`** as the HUD: **`duration_ms`** accumulation vs **`executingStartedAtMs`** while **`phase === 'executing'`** (REST + websocket batches).
4. **Optional:** load a **Cove artifacts bundle** (JSON) at runtime to add **`clipAliases`**, idle candidates, and cue resonance without editing TypeScript — see **`docs/SKL_MOVE_ARTIFACTS_COVE.md`**. Set **`VITE_SKL_ARTIFACTS_URL`** to override the default path under `public/artifacts/`.

Until clips exist in the GLB, **`AnimationCue`** remains the contract for semantics and timing; the SKL file stays **static posed geometry** with skin weights ready for clips, and playback degrades gracefully (**zero clips**).
