import { z } from 'zod'
import {
  mazinkaiserCinematicScaleProfileSchema,
  parseTelemetryLoose,
} from './telemetry.js'
import type { MazinkaiserCinematicScaleProfileWire, SKLTelemetryState } from './telemetry.js'
import { parseMoveExecutionBatch } from './moveExecution.js'
import type { SKLMoveExecutionBatch } from './moveExecution.js'

/** Wire envelope for `GET/POST` cockpit endpoints that return `{ session_id, state, cinematic_scale_profile? }`. */
export const cockpitEnvelopeWireSchema = z
  .object({
    session_id: z.string(),
    state: z.unknown(),
    cinematic_scale_profile: z.unknown().optional(),
  })
  .passthrough()

export type CockpitEnvelopeWire = z.infer<typeof cockpitEnvelopeWireSchema>

export const cockpitMoveDemoWireSchema = z
  .object({
    session_id: z.string(),
    state: z.unknown(),
    move_batch: z.unknown(),
    cinematic_scale_profile: z.unknown().optional(),
  })
  .passthrough()

export type CockpitMoveDemoWire = z.infer<typeof cockpitMoveDemoWireSchema>

export type CoercedCockpitEnvelope = {
  session_id: string
  state: SKLTelemetryState
  cinematic_scale_profile?: MazinkaiserCinematicScaleProfileWire | undefined
}

export type CoercedMoveDemoResponse = CoercedCockpitEnvelope & {
  move_batch: SKLMoveExecutionBatch | null
}

/** Runtime-check REST JSON; returns `undefined` if the envelope is unusable (caller may fall back to `as` casts). */
export function coerceCockpitEnvelope(raw: unknown): CoercedCockpitEnvelope | undefined {
  const p = cockpitEnvelopeWireSchema.safeParse(raw)
  if (!p.success) return undefined
  const state = parseTelemetryLoose(p.data.state)
  if (!state) return undefined
  let cinematic_scale_profile: MazinkaiserCinematicScaleProfileWire | undefined
  if (p.data.cinematic_scale_profile !== undefined) {
    const pr = mazinkaiserCinematicScaleProfileSchema.safeParse(p.data.cinematic_scale_profile)
    if (pr.success) cinematic_scale_profile = pr.data
  }
  return { session_id: p.data.session_id, state, cinematic_scale_profile }
}

export function coerceCockpitMoveDemoResponse(raw: unknown): CoercedMoveDemoResponse | undefined {
  const p = cockpitMoveDemoWireSchema.safeParse(raw)
  if (!p.success) return undefined
  const state = parseTelemetryLoose(p.data.state)
  if (!state) return undefined
  let cinematic_scale_profile: MazinkaiserCinematicScaleProfileWire | undefined
  if (p.data.cinematic_scale_profile !== undefined) {
    const pr = mazinkaiserCinematicScaleProfileSchema.safeParse(p.data.cinematic_scale_profile)
    if (pr.success) cinematic_scale_profile = pr.data
  }
  const moveBatchRaw = p.data.move_batch
  let move_batch: SKLMoveExecutionBatch | null = null
  if (moveBatchRaw != null && typeof moveBatchRaw === 'object') {
    move_batch = parseMoveExecutionBatch(moveBatchRaw) ?? (moveBatchRaw as SKLMoveExecutionBatch)
  }
  return { session_id: p.data.session_id, state, move_batch, cinematic_scale_profile }
}
