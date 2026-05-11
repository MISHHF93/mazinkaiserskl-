import { describe, expect, it } from 'vitest'
import {
  parseCockpitRealtimePayload,
  telemetryFromRealtimeEvent,
  parseTelemetryLoose,
  coerceCockpitEnvelope,
  coerceCockpitMoveDemoResponse,
} from '@mazinkaiser/shared-types'

describe('cockpit realtime payload', () => {
  it('parses telemetry frame and normalizes HUD', () => {
    const raw = {
      type: 'telemetry',
      telemetry: {
        photon_power_pct: 80,
        armor_integrity_pct: 100,
        heat_level_pct: 20,
        reactor_output_pct: 60,
        sync_rate_pct: 99,
        movement_ready: true,
        tactical_alert: '',
        energy_reserve_pct: 50,
        mode: 'KAISER_CORE_MODE',
        cooldowns: {},
        updated_at: '2026-05-11T00:00:00Z',
      },
    }
    const p = parseCockpitRealtimePayload(raw)
    expect(p.ok).toBe(true)
    if (!p.ok) return
    const hud = telemetryFromRealtimeEvent(p.event)
    expect(hud?.photon_power_pct).toBe(80)
  })

  it('parses move_event with passthrough move_batch', () => {
    const raw = {
      type: 'move_event',
      move_batch: {
        move_id: 'rocket-punch',
        animation_plan: [{ phase: 'hud', hud_event: 'x', duration_ms: 100, severity: 'info', payload: {} }],
      },
      telemetry: {
        photon_power_pct: 1,
        armor_integrity_pct: 1,
        heat_level_pct: 1,
        reactor_output_pct: 1,
        sync_rate_pct: 1,
        movement_ready: true,
        tactical_alert: '',
        energy_reserve_pct: 1,
        mode: 'M',
        cooldowns: {},
        updated_at: '2026-05-11T00:00:00Z',
      },
    }
    const p = parseCockpitRealtimePayload(raw)
    expect(p.ok).toBe(true)
  })

  it('parseTelemetryLoose tolerates additive keys', () => {
    const hud = parseTelemetryLoose({
      photon_power_pct: 10,
      extra_future_field: 'x',
      armor_integrity_pct: 10,
      heat_level_pct: 10,
      reactor_output_pct: 10,
      sync_rate_pct: 10,
      movement_ready: false,
      tactical_alert: '',
      energy_reserve_pct: 10,
      mode: 'X',
      cooldowns: {},
      updated_at: 't',
    })
    expect(hud).not.toBeNull()
  })
})

describe('REST envelope coercion', () => {
  const minimalHud = {
    photon_power_pct: 1,
    armor_integrity_pct: 1,
    heat_level_pct: 1,
    reactor_output_pct: 1,
    sync_rate_pct: 1,
    movement_ready: true,
    tactical_alert: '',
    energy_reserve_pct: 1,
    mode: 'M',
    cooldowns: {},
    updated_at: 't',
  }

  it('coerceCockpitEnvelope accepts cockpit envelope', () => {
    const c = coerceCockpitEnvelope({ session_id: 's', state: minimalHud })
    expect(c?.session_id).toBe('s')
    expect(c?.state.mode).toBe('M')
  })

  it('coerceCockpitMoveDemoResponse includes move_batch', () => {
    const c = coerceCockpitMoveDemoResponse({
      session_id: 's',
      state: minimalHud,
      move_batch: { move_id: 'x', animation_plan: [] },
    })
    expect(c?.move_batch?.move_id).toBe('x')
  })
})