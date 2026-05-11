/** WebSocket protocol helpers for `/ws/cockpit` (protocol v1). */

import { parseCockpitRealtimePayload, telemetryFromRealtimeEvent, COCKPIT_WS_PROTOCOL_VERSION } from '@mazinkaiser/shared-types'
import type { MechaHudState } from '../types'

export { COCKPIT_WS_PROTOCOL_VERSION }

/** Exponential backoff with jitter for resilient reconnects (non-blocking timer is caller's job). */
export function websocketReconnectDelayMs(attemptIndex: number, maxMs = 30_000): number {
  const base = Math.min(maxMs, 750 * 2 ** Math.min(attemptIndex, 8))
  const jitter = Math.floor(Math.random() * 280)
  return base + jitter
}

/** Map inbound JSON to HUD state (`telemetry` replaces legacy `state`) with Zod normalization. */
export function extractHudPayload(msg: unknown): MechaHudState | null {
  const parsed = parseCockpitRealtimePayload(msg)
  if (parsed.ok) return telemetryFromRealtimeEvent(parsed.event)
  return null
}

export function buildHelloFrame(topics: string[]): { type: string; topics: string[] } {
  return { type: 'hello', topics }
}
