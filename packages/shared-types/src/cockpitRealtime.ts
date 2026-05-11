import { z } from 'zod'
import { parseTelemetryLoose } from './telemetry.js'
import type { SKLTelemetryState } from './telemetry.js'
import { sklMoveExecutionBatchSchema } from './moveExecution.js'

/** WebSocket `/ws/cockpit` protocol — keep aligned with `docs/API.md` and backend frames. */
export const COCKPIT_WS_PROTOCOL_VERSION = 1 as const

const welcomeSchema = z
  .object({
    type: z.literal('welcome'),
    session_id: z.string(),
    cinematic_scale_profile: z.unknown().optional(),
  })
  .passthrough()

/** Wire payloads may omit additive HUD fields; normalize at consumption with {@link parseTelemetryLoose}. */
const hudWireSchema = z.record(z.string(), z.unknown())

const telemetrySchema = z
  .object({
    type: z.literal('telemetry'),
    telemetry: hudWireSchema,
  })
  .passthrough()

const stateSchema = z
  .object({
    type: z.literal('state'),
    state: hudWireSchema,
  })
  .passthrough()

const sessionSchema = z
  .object({
    type: z.literal('session'),
    session_id: z.string(),
    state: hudWireSchema.optional(),
  })
  .passthrough()

const moveEventSchema = z
  .object({
    type: z.literal('move_event'),
    move_batch: sklMoveExecutionBatchSchema,
    telemetry: hudWireSchema.optional(),
  })
  .passthrough()

const assistantSchema = z
  .object({
    type: z.literal('assistant'),
    text: z.string(),
    trace_id: z.string().optional(),
  })
  .passthrough()

const assistantTokenSchema = z
  .object({
    type: z.literal('assistant_token'),
    token: z.string(),
    trace_id: z.string().optional(),
  })
  .passthrough()

const assistantDoneSchema = z
  .object({
    type: z.literal('assistant_done'),
    trace_id: z.string().optional(),
  })
  .passthrough()

const fallbackSchema = z.object({ type: z.string() }).passthrough()

/** Every inbound JSON object we attempt to classify; unknown shapes still parse as fallback. */
export const cockpitRealtimeEventSchema = z.union([
  welcomeSchema,
  telemetrySchema,
  stateSchema,
  sessionSchema,
  moveEventSchema,
  assistantSchema,
  assistantTokenSchema,
  assistantDoneSchema,
  fallbackSchema,
])

export type CockpitRealtimeEvent = z.infer<typeof cockpitRealtimeEventSchema>

export type ParsedCockpitInbound =
  | { ok: true; event: CockpitRealtimeEvent }
  | { ok: false; raw: unknown; issues: z.ZodIssue[] }

export function parseCockpitRealtimePayload(json: unknown): ParsedCockpitInbound {
  const r = cockpitRealtimeEventSchema.safeParse(json)
  if (r.success) return { ok: true, event: r.data }

  const asObj =
    json != null && typeof json === 'object' && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : null
  if (asObj && typeof asObj.type === 'string') {
    return { ok: true, event: fallbackSchema.parse(asObj) as CockpitRealtimeEvent }
  }

  return { ok: false, raw: json, issues: r.error.issues }
}

/** Best-effort telemetry extraction from a parsed event (normalized to {@link SKLTelemetryState}). */
export function telemetryFromRealtimeEvent(event: CockpitRealtimeEvent): SKLTelemetryState | null {
  if (event.type === 'telemetry') return parseTelemetryLoose(event.telemetry)
  if (event.type === 'state') return parseTelemetryLoose(event.state)
  if (event.type === 'session' && event.state) return parseTelemetryLoose(event.state)
  if (event.type === 'move_event' && event.telemetry) return parseTelemetryLoose(event.telemetry)

  const any = event as { type?: string; telemetry?: unknown; state?: unknown }
  if (any.type === 'telemetry' && any.telemetry != null) return parseTelemetryLoose(any.telemetry)
  if (any.type === 'state' && any.state != null) return parseTelemetryLoose(any.state)
  if (any.type === 'session' && any.state != null) return parseTelemetryLoose(any.state)
  if (any.type === 'move_event' && any.telemetry != null) return parseTelemetryLoose(any.telemetry)
  return null
}
