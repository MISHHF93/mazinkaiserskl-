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

export function pickIdleClipFromAnimations(animations: readonly { name: string }[]): string | null {
  for (const candidate of IDLE_CLIP_CANDIDATES) {
    const hit = animations.find((a) => a.name === candidate)
    if (hit) return hit.name
  }
  return null
}

/**
 * Resolve a glTF clip name for one backend cue + move slug.
 * Returns null when no clip should run for this cue (mixer keeps previous / idle).
 */
function aliasMoveSlugClip(slugRaw: string): string {
  const slugLower = slugRaw.toLowerCase()
  return MOVE_SLUG_CLIP_ALIASES[slugLower] ?? slugRaw
}

export function resolveSklClipForCue(
  backendMoveId: string | null,
  cue: AnimationPlanCueWire,
): string | null {
  const slugRaw = backendMoveId?.trim() ?? ''
  const ev = cue.hud_event.toLowerCase()

  // Prefer move-wide clip named exactly like API slug (recommended authoring convention).
  if (slugRaw && (ev.includes('execution_burst') || ev.includes('avatar.anim.execution'))) {
    return aliasMoveSlugClip(slugRaw)
  }

  if (slugRaw && (ev.includes('phase_charge') || ev.includes('avatar.system.phase'))) {
    return `${slugRaw}-charge`
  }

  if (slugRaw && (ev.includes('arm_switch') || ev.includes('command.arm'))) {
    return `${slugRaw}-arm`
  }

  if (slugRaw && (ev.includes('recoil') || ev.includes('recoil_shockwave'))) {
    return `${slugRaw}-recoil`
  }

  if (slugRaw && (ev.includes('cooldown') || ev.includes('cooldown_ribbon'))) {
    return `${slugRaw}-cooldown`
  }

  return null
}
