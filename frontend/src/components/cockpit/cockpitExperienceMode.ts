import type { AvatarPresentation } from '../../avatar/presentation'
import type { SklMovePlaybackSnapshot } from '../../avatar/presentation/types'
import type { CameraMode } from '@mazinkaiser/shared-types'

/**
 * Single cockpit UX mode. Framing (camera, chrome intensity) still follows live
 * `CockpitExperienceInput` via {@link unifiedCockpitCameraPreset}.
 */
export type CockpitExperienceMode = 'UNIFIED'

export type CockpitExperienceInput = {
  presentation: AvatarPresentation
  movePlayback: SklMovePlaybackSnapshot
  /** User opened diagnostics / tactical console or forced diagnostic SKL view */
  diagnosticSurfaceActive: boolean
}

export function cockpitExperienceLabel(_m: CockpitExperienceMode): string {
  return 'Unified'
}

/** Maps live cockpit signals to SKL camera preset (replaces the old multi-enum → camera map). */
export function unifiedCockpitCameraPreset(i: CockpitExperienceInput): CameraMode {
  const ph = i.movePlayback.phase
  if (ph === 'charging' || ph === 'executing' || ph === 'cooldown') return 'move'
  if (i.diagnosticSurfaceActive || i.presentation.semantic === 'DIAGNOSTIC') return 'diagnostic'
  if (i.presentation.semantic === 'COMBAT_READY') return 'cinematic'
  return 'pilot'
}
