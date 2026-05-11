/** WebSocket protocol helpers for `/ws/cockpit` (protocol v1). */

import type { MechaHudState } from '../types'

export const COCKPIT_WS_PROTOCOL_VERSION = 1 as const

/** Exponential backoff with jitter for resilient reconnects (non-blocking timer is caller's job). */
export function websocketReconnectDelayMs(attemptIndex: number, maxMs = 30_000): number {
  const base = Math.min(maxMs, 750 * 2 ** Math.min(attemptIndex, 8))
  const jitter = Math.floor(Math.random() * 280)
  return base + jitter
}

/** Map inbound JSON to HUD state (`telemetry` replaces legacy `state`). */
export function extractHudPayload(msg: { type?: unknown; telemetry?: unknown; state?: unknown }): MechaHudState | null {
  if (msg.type === 'telemetry' && msg.telemetry && typeof msg.telemetry === 'object') {
    return msg.telemetry as MechaHudState
  }
  if (msg.type === 'state' && msg.state && typeof msg.state === 'object') {
    return msg.state as MechaHudState
  }
  if (msg.type === 'session' && msg.state && typeof msg.state === 'object') {
    return msg.state as MechaHudState
  }
  return null
}

export function buildHelloFrame(topics: string[]): { type: string; topics: string[] } {
  return { type: 'hello', topics }
}
