/**
 * Typed labels for SKL move → AnimationMixer path (HUD phases vs glTF clips).
 * Emitted for observability / dev tooling; not a WebSocket wire enum today.
 */

export type SklAnimationPipelineKind =
  | 'move_phase'
  | 'cue_tick'
  | 'clip_start'
  | 'clip_missing'
  | 'mixer_sync'

export type SklAnimationPipelineEvent = {
  kind: SklAnimationPipelineKind
  backendMoveId?: string | null | undefined
  clipName?: string | undefined
  planIndex?: number | undefined
  wallTimeMs?: number | undefined
}
