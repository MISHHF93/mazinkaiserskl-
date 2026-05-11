# Cinematic Talking Mazinkaiser Avatar — roadmap & architecture

This document defines how the cockpit evolves from **browser MVP** to **Anime 2.5D** to **cinematic 3D** — without treating Mazinkaiser as a generic human talking head.

## Design principle: mechanical speech

Mazinkaiser should “speak” through **articulated machine language**, not imitation human lips alone:

| Channel | Role |
|---------|------|
| **Visor articulation / pulse** | Primary speech read; sync to TTS envelope |
| **Jaw plate / vent vibration** | Subtle amplitude from audio RMS, not lipstick sync |
| **Eye glow intensity** | Plasmatic attention + sync state |
| **Chest reactor pulse** | Photon Power / telemetry coupling |
| **Neck servo & head micro-motion** | Mass, inertia, combat stance |
| **Battle alert / tactical glow** | HUD + entity threat mirroring |
| **Photon aura & Nova buildup** | Catastrophic/overload storytelling |
| **Cockpit waveform + subtitles** | Human-readable redundancy |

Canonical **normalized rig channels** (`0 … 1`) are defined in TypeScript as `MechanicalSpeakRig` in `frontend/src/avatar/presentation/types.ts`. `deriveMechanicalSpeakSnapshot()` maps current `AvatarRuntimeCues` + `AvatarPresentation` into that snapshot for future Live2D weights, USD/GLTF morph targets, or Unreal **`ControlRig`/Materials**.

## End-to-end voice & animation pipeline

```text
User voice
  → STT (browser or server)
  → Mazinkaiser AI brain (FastAPI orchestration)
  → response text + safety
  → TTS audio stream
  → audio analysis (RMS/envelope/feature stream)
       ├ Tier 1: Web Audio → waveform + pulse drives in React
       ├ Tier 2: Live2D parameter hooks + motion queues
       └ Tier 3: Audio2Face / custom solver → skeletal or blend-shape stream → viewer
  → Avatar host (layered image / Cubism / WebGL / UE stream)
  → Cockpit HUD (telemetry + subtitles unchanged)
```

The backend already avoids shipping raw avatar pixels over WebSockets (`avatar_state` is boolean/config-oriented). **Tier 3** may add optional **topics** later (e.g. `blendshape_frames`) behind explicit consent/versioning — out of scope for this roadmap file.

---

## Tier 1 — MVP layered image avatar (today)

**Stack:** Mazinkaiser still image (+ optional upload), layered CSS/SVG overlays, cockpit reactor + waveform elsewhere.

Delivered baseline:

- Upload / session **`avatar_data_url`** (already wired)
- **Eye glow**, **alert shroud**, **reactor pulse**, semantic states (`AvatarSemanticState`)
- Move demonstration overlay + Photon palette
- **Subtitles / Kaiser line** in cockpit rail
- **Mode-based visuals** (`PersonalityMode` → cues → `resolveAvatarPresentation`)

**Next increments (same tier):** explicit **visor pulse** lane driven from Web Audio TTS RMS; layered mask regions (visor plate as separate DIV/SVG blend).

---

## Tier 2 — Live2D Cubism (anime cinematic 2.5D)

**Intent:** Anime-accurate presence in-browser; still not “film realistic flesh.”

Prepared artifact model (Cubism SDK / Editor exports):

| Artifact | Typical role |
|----------|----------------|
| `.cmo3` | **Editor source only** — not loaded in browser |
| `.moc3` | Runtime mesh |
| `.model3.json` | Model descriptor (textures, groups, motions) |
| `.motion3.json` | Discrete animations |
| `.physics3.json` | Cloth/hair/skirt-style physics (**adapt** for pauldron/boot metallic sway if desired) |
| **Expressions / parameters** | Map to semantic + `MechanicalSpeakRig` |

See Live2D’s embedded workflow: [Data for Embedded Use (export `.moc3` / `.motion3` files)](https://docs.live2d.com/en/cubism-editor-manual/export-moc3-motion3-files/).

**Integration shape:** Implement `AvatarPresentationHost` with `kind: 'live2d'`; same `AvatarPresentation` snapshot drives Live2D **parameter lerping** (`eyeGlowIntensity` ↔ eye param, etc.). Audio envelope feeds **visor** + **mouth slot** parameters as **mechanical** pulsation weights, not human viseme tables.

Runtime bundle references are optionally described in TypeScript (`Live2DEmbeddedArtifactSet`) for-repo path discipline.

---

## Tier 3 — Cinematic realistic 3D (Audio2Face-class + engine)

**Intent:** Highest fidelity — heavy assets, workstation or cloud GPUs.

Pipeline sketch:

```text
Blender / Maya / ZBrush (high-detail Mazinkaiser bust)
  → Rig: mechanical articulation + optional ARKit-named blendshape *superset*
  → NVIDIA Audio2Face-class audio-driven animation for **non-human** rigs
       (articulate plating, visor, vents — retarget curves to Kaiser rig)
       • Reference: NVIDIA’s open Audio2Face model / UE/Maya integrations
       • Blog: https://developer.nvidia.com/blog/nvidia-open-sources-audio2face-animation-model/
  → Output path A: Unreal Engine cinematic + **Pixel Streaming** into React shell
       → Frontend host `kind: 'unreal_stream'`
       → Controlled by existing session + cues (thin control channel alongside stream)
    Output path B: glTF/glb + **Three.js / WebGL** in-browser presenter
       → Frontend host `kind: 'three'`
```

**ARKit-compatible blendshape names** are useful as **interchange lingua franca** for tooling; Kaiser-specific morphs (**jaw plate**, **visor iris**, **reactor diaphragm**) should extend that list explicitly in the rig DCC file. The cockpit only needs stable **logical** names (`MechanicalSpeakRig`) — DCC exporters map logical → physical curves.

---

## Technology matrix

| Concern | Choice |
|---------|--------|
| **Frontend** | React + TypeScript (+ Framer Motion for Tier 1); Tier 3: Three.js viewer or UE Pixel Streaming iframe/WebRTC |
| **Backend** | FastAPI + WebSockets (`/ws/cockpit`) |
| **Voice** | STT + TTS behind existing provider abstraction (`docs/` voice notes) |
| **Animation tiers** | Tier 1: presentation resolver; Tier 2: Cubism runtime; Tier 3: Audio2Face / custom audio→rig + UE or WebGL |

---

## Module map (repo today)

| Path | Responsibility |
|------|----------------|
| `frontend/src/avatar/presentation/types.ts` | `AvatarPresentation`, tiers, mechanical rig typing, artifact stubs |
| `frontend/src/avatar/presentation/resolveAvatarPresentation.ts` | Semantic resolver + `deriveMechanicalSpeakSnapshot()` |
| `frontend/src/avatar/view/ImageAvatarViewer.tsx` | Tier 1 viewer |
| `frontend/src/theme/soundArchitecture.ts` | Future SFX enqueue — pair with waveform → rig |
| `mazinkaiser/realtime/*` | Session fan-out; avatar privacy posture |

---

## What we explicitly avoid

- **Human lipstick / dental focus** as the primary read for “speaking Kaiser.”
- **Coupling cognition** inside Live2D/UE SDKs — the brain stays in Python; presenters are **thin**.

This roadmap is authoritative for avatar scope; defer API shape changes not listed here until `docs/API.md` is bumped.
