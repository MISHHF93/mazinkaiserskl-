Avatar viewport README (legacy anchor). **`ImageAvatarViewer` and overlays live in `src/avatar/view/`**.

## Presentation hub

Tier-agnostic cockpit snapshot types and resolver: **`src/avatar/presentation/`**

- **`resolveAvatarPresentation`** — HUD/cues → `AvatarPresentation` (semantic, glow weights, moves).
- **`deriveMechanicalSpeakSnapshot`** — same cues + snapshot → **`MechanicalSpeakRig`** (visor pulse, reactor, mechanical “jaw” amplitude, neck/head servo lanes) for Live2D / Three.js / Unreal presenters — **not** human lip-sync semantics.

Roadmap Audio2Face / Cubism artifact layout: **`docs/CINEMATIC_AVATAR.md`**.
