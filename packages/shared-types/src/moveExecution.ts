import { z } from 'zod'

/** One row from `move_batch.animation_plan` — matches backend `AnimationCue` wire shape. */
export const animationPlanCueWireSchema = z.object({
  phase: z.string(),
  hud_event: z.string(),
  duration_ms: z.number().nonnegative(),
  severity: z.enum(['info', 'warn', 'critical']),
  payload: z.record(z.string(), z.unknown()),
})

export type AnimationPlanCueWire = z.infer<typeof animationPlanCueWireSchema>

export const sklMoveExecutionBatchSchema = z
  .object({
    outcome: z.string().optional(),
    move_id: z.string().optional(),
    voice_line: z.string().optional(),
    animation_plan: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough()

export type SKLMoveExecutionBatch = z.infer<typeof sklMoveExecutionBatchSchema>

export function parseMoveExecutionBatch(raw: unknown): SKLMoveExecutionBatch | null {
  if (raw == null || typeof raw !== 'object') return null
  const r = sklMoveExecutionBatchSchema.safeParse(raw)
  return r.success ? r.data : null
}
