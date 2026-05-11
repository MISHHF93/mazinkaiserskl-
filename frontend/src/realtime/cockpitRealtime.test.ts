import { describe, expect, it } from 'vitest'

import { extractHudPayload, websocketReconnectDelayMs } from './cockpitRealtime'

describe('cockpitRealtime', () => {
  it('extractHudPayload prefers telemetry envelope', () => {
    const hud = extractHudPayload({
      type: 'telemetry',
      telemetry: { mode: 'KAISER_CORE_MODE', movement_ready: true, cooldowns: {}, updated_at: 't' },
    })
    expect(hud?.mode).toBe('KAISER_CORE_MODE')
  })

  it('websocketReconnectDelayMs grows with bounded attempt index', () => {
    expect(websocketReconnectDelayMs(0)).toBeGreaterThanOrEqual(750)
    expect(websocketReconnectDelayMs(40)).toBeLessThanOrEqual(30280)
  })
})
