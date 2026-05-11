import type { MechaHudState, PersonalityMode } from '../../types'

/**
 * Canonical cockpit avatar narrative states (image presenter today; same enum for Live2D/GLB drivers).
 */

export type AvatarSemanticState =
  | 'IDLE'
  | 'SPEAKING'
  | 'DIAGNOSTIC'
  | 'TACTICAL'
  | 'GUARDIAN'
  | 'COMBAT_READY'
  | 'MOVE_CHARGING'
  | 'MOVE_EXECUTING'
  | 'OVERDRIVE'
  | 'NOVA_PREP'
  | 'CRITICAL'

export type MoveDemoPhase = 'idle' | 'charging' | 'executing' | 'cooldown'

/** One row from REST / WS `move_batch.animation_plan` — mirrors backend `AnimationCue` serialization. */
export type AnimationPlanCueWire = {
  phase: string
  hud_event: string
  duration_ms: number
  severity: 'info' | 'warn' | 'critical'
  payload: Record<string, unknown>
}

/** Snapshot passed to `SKLModelViewer` for glTF clip scheduling vs backend cue timeline. */
export type SklMovePlaybackSnapshot = {
  phase: MoveDemoPhase
  backendMoveId: string | null
  animationPlan: readonly AnimationPlanCueWire[]
  /** `performance.now()` when `phase` became `executing` for this move; null otherwise. */
  executingStartedAtMs: number | null
  /** Human-readable move title / grid label — derives clip slug during `charging` before `backendMoveId` exists. */
  moveLabel?: string
}

/** Grouped cinematography hints derived from REST `animation_plan[].hud_event` prefixes. */

export type MoveVisualKind =
  | 'neutral'
  | 'melee'
  | 'beam'
  | 'thermal'
  | 'blade'
  | 'nova'
  | 'field'
  | 'thruster'

export type AvatarRuntimeCues = {
  hud: MechaHudState | null
  personalityMode: PersonalityMode
  ttsSpeaking: boolean
  micListening: boolean
  /** Host-driven timer (performance.now expiry) */

  diagnosticUntilMs: number
  move: {
    phase: MoveDemoPhase
    /** Human-readable move button label */
    label: string
    /** Snake-case id from backend `move_batch.move_id`, when accepted */
    backendMoveId?: string | null
    visualHint: MoveVisualKind
    /** Severity tags from REST animation_plan (last run) */
    planSeverities: ReadonlyArray<'info' | 'warn' | 'critical'>
    /** Full backend cue timeline for SKL `AnimationMixer` (normalized). */
    animationPlan: readonly AnimationPlanCueWire[]
    /** Wall-clock anchor for cue-relative playback while `phase === 'executing'`. */
    executingStartedAtMs: number | null
  }
}

export type AvatarPresentation = {
  semantic: AvatarSemanticState
  listening: boolean
  /** 0–1 intensities for shader/Live2D/mechanical rigs */
  eyeGlow: number
  reactorGlow: number
  alertShroud: number
  overdriveSheen: number
  novaCorona: number
  cinematicMove: boolean
  moveVisual: MoveVisualKind
  /** Short label for HUD chip */
  stateLabel: string
}

/**
 * Mecha-centric “speech” articulation snapshot for Tier 2/3 rigs.
 * All values normalized 0…1 unless otherwise noted (`headTilt` uses 0.5 neutral).
 * Map to Cubism params, skeletal bones, morph targets, or materials.
 */
export type MechanicalSpeakRig = {
  eyeGlowIntensity: number
  visorPulse: number
  /** Mechanical vent / jaw plate amplitude — NOT human lip sync semantics */
  jawPlateOpen: number
  chestReactorPulse: number
  neckServoMotion: number
  /** ~0.5 = neutral stance; guardian/tactical deltas applied in derivation */
  headTilt: number
  battleAlertGlow: number
  photonAuraIntensity: number
}

/** Explicit technology tier labels for roadmap / session config UX (no runtime loader yet). */

export type MazinkaiserAvatarTier = 'mvp_layered_image' | 'tier2_live2d_cubism' | 'tier3_cinematic_3d'

/**
 * Cubism embedded bundle — `.cmo3` stays editor-local; `.moc3` + `.model3.json`
 * ship to static hosting or CDN. See **`docs/CINEMATIC_AVATAR.md`**.
 */

export type Live2DEmbeddedArtifactSet = {
  /** Relative to `frontend/public` or CDN root — omit on disk until assets exist */
  cmo3SourceRelativePath?: string
  moc3RelativePath: string
  model3JsonRelativePath: string
  textureBaseRelativePath?: string
  physics3JsonRelativePath?: string
  expressionJsonGlob?: string
  motion3JsonGlob?: string
}

/** Describes where Tier 3 pixels are rasterized — implement as a thin `AvatarPresentationHost`. */

export type CinematicAvatarViewerTarget =
  | { viewer: 'three_webgl'; glbRelativePath?: string }
  | { viewer: 'unreal_pixel_stream'; streamUrl?: string }

/** Future Live2D / alternative hosts implement this — cockpit hull uses `ImageAvatarViewer` (Three.js viewport + optional CPU-side GLB structure inspector). */

export interface AvatarPresentationHost {
  readonly kind: 'image' | 'live2d' | 'three' | 'unreal_stream'
  /** Immutable presentation snapshots at ~HUD cadence (Tier 1–3). */
  applySnapshot(presentation: AvatarPresentation): void
  /** Tier 2/3 hosts may ingest explicit normalized rig channels alongside presentation. */
  applyMechanicalRig?(rig: MechanicalSpeakRig): void
}