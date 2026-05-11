import type { AvatarPresentation } from '../../avatar/presentation'
import type { SklMovePlaybackSnapshot } from '../../avatar/presentation/types'

/**
 * UI-only cockpit framing modes (orthogonal to backend `PersonalityMode`).
 * Drives chrome, SKL camera hints, and overlay intensity.
 */
export type CockpitExperienceMode =
  | 'PILOT_VIEW'
  | 'COMBAT_READY'
  | 'DIAGNOSTIC'
  | 'MOVE_DEMO'
  | 'FINAL_COUNT'

export type CockpitExperienceInput = {
  presentation: AvatarPresentation
  movePlayback: SklMovePlaybackSnapshot
  /** User opened diagnostics drawer or forced diagnostic SKL view */
  diagnosticSurfaceActive: boolean
}

/**
 * Priority: active move → diagnostic surface / semantic → combat → pilot default.
 */
export function deriveCockpitExperienceMode(i: CockpitExperienceInput): CockpitExperienceMode {
  const ph = i.movePlayback.phase
  if (ph === 'charging' || ph === 'executing') return 'MOVE_DEMO'
  if (ph === 'cooldown') return 'FINAL_COUNT'

  if (i.diagnosticSurfaceActive || i.presentation.semantic === 'DIAGNOSTIC') return 'DIAGNOSTIC'

  if (i.presentation.semantic === 'COMBAT_READY') return 'COMBAT_READY'

  return 'PILOT_VIEW'
}

export function cockpitExperienceLabel(m: CockpitExperienceMode): string {
  return m.replace(/_/g, ' ')
}
