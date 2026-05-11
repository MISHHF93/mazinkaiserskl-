import type { AnimationPlanCueWire } from '../presentation/types'

/** Try these names when returning to idle bind pose (first match wins). */
export const IDLE_CLIP_CANDIDATES = ['idle', 'Idle', 'TPose', 'T-Pose', 'BindPose', 'bind_pose'] as const

/**
 * When GLB clip names match REST `move_id` slugs exactly, map here if export uses an alias.
 * Keys are lowercase kebab-case.
 */
export const MOVE_SLUG_CLIP_ALIASES: Partial<Record<string, string>> = {
  // Example: 'rocket-punch': 'RocketPunchAction',
}

/** Runtime Cove / ML overrides — merged with {@link MOVE_SLUG_CLIP_ALIASES} in {@link aliasMoveSlugClip}. */
let artifactAliasOverrides: Partial<Record<string, string>> = {}

/** Prepended to {@link IDLE_CLIP_CANDIDATES} when Cove bundle supplies extra names. */
let artifactIdlePrelude: string[] = []

/**
 * Optional cue→clip templates from Cove (`cueResonance`). When non-empty, these are tried first
 * (sorted by `order`), then legacy heuristics.
 */
let artifactCuePatterns: SklCueResonancePattern[] = []

export type SklCueResonancePattern = {
  hudEventIncludes: string
  /** Use `{slug}` for REST `move_id` (kebab-case). */
  clipTemplate: string
  order?: number
}

export function registerSklArtifactAliases(aliases: Record<string, string>): void {
  artifactAliasOverrides = { ...artifactAliasOverrides, ...aliases }
}

export function registerSklArtifactIdleCandidates(names: readonly string[]): void {
  artifactIdlePrelude = [...names]
}

export function registerSklArtifactCuePatterns(rows: readonly SklCueResonancePattern[]): void {
  artifactCuePatterns = [...rows]
}

/** @internal testing */
export function resetSklArtifactRegistriesForTests(): void {
  artifactAliasOverrides = {}
  artifactIdlePrelude = []
  artifactCuePatterns = []
}

function mapLogicalToExportedClipName(logical: string): string {
  const k = logical.toLowerCase()
  return artifactAliasOverrides[k] ?? logical
}

export function pickIdleClipFromAnimations(animations: readonly { name: string }[]): string | null {
  const order = [...artifactIdlePrelude, ...IDLE_CLIP_CANDIDATES]
  for (const candidate of order) {
    const hit = animations.find((a) => a.name === candidate)
    if (hit) return hit.name
  }
  return null
}

function aliasMoveSlugClip(slugRaw: string): string {
  const slugLower = slugRaw.toLowerCase()
  return artifactAliasOverrides[slugLower] ?? MOVE_SLUG_CLIP_ALIASES[slugLower] ?? slugRaw
}

function tryResolveFromArtifactPatterns(slugRaw: string, ev: string): string | null {
  if (artifactCuePatterns.length === 0 || !slugRaw) return null
  const sorted = [...artifactCuePatterns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  for (const row of sorted) {
    if (!ev.includes(row.hudEventIncludes.toLowerCase())) continue
    const logical = row.clipTemplate.replace(/\{slug\}/gi, slugRaw.trim())
    return mapLogicalToExportedClipName(logical)
  }
  return null
}

/**
 * Resolve a glTF clip name for one backend cue + move slug.
 * Returns null when no clip should run for this cue (mixer keeps previous / idle).
 */
export function resolveSklClipForCue(
  backendMoveId: string | null,
  cue: AnimationPlanCueWire,
): string | null {
  const slugRaw = backendMoveId?.trim() ?? ''
  const ev = cue.hud_event.toLowerCase()

  const fromArtifacts = tryResolveFromArtifactPatterns(slugRaw, ev)
  if (fromArtifacts) return fromArtifacts

  if (slugRaw && (ev.includes('execution_burst') || ev.includes('avatar.anim.execution'))) {
    return mapLogicalToExportedClipName(aliasMoveSlugClip(slugRaw))
  }

  if (slugRaw && (ev.includes('phase_charge') || ev.includes('avatar.system.phase'))) {
    return mapLogicalToExportedClipName(`${slugRaw}-charge`)
  }

  if (slugRaw && (ev.includes('arm_switch') || ev.includes('command.arm'))) {
    return mapLogicalToExportedClipName(`${slugRaw}-arm`)
  }

  if (slugRaw && (ev.includes('recoil') || ev.includes('recoil_shockwave'))) {
    return mapLogicalToExportedClipName(`${slugRaw}-recoil`)
  }

  if (slugRaw && (ev.includes('cooldown') || ev.includes('cooldown_ribbon'))) {
    return mapLogicalToExportedClipName(`${slugRaw}-cooldown`)
  }

  return null
}
