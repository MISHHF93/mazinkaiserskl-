import { z } from 'zod'

/**
 * Cockpit HUD / twin telemetry snapshot — mirrors FastAPI `MechaState` JSON
 * (`GET /cockpit/state`, WS `telemetry` / `state` payloads). Optional keys stay
 * compatible with older backends (additive fields pass through as unknown when
 * using {@link parseTelemetryLoose}).
 */
export const mechaHudStateSchema = z.object({
  photon_power_pct: z.number(),
  armor_integrity_pct: z.number(),
  heat_level_pct: z.number(),
  reactor_output_pct: z.number(),
  sync_rate_pct: z.number(),
  movement_ready: z.boolean(),
  tactical_alert: z.string(),
  energy_reserve_pct: z.number(),
  mode: z.string(),
  operational_state: z.string().optional(),
  scrander_status: z.string().optional(),
  pilder_docking_status: z.string().optional(),
  movement_state: z.string().optional(),
  alerts_active: z.array(z.string()).optional(),
  last_demo_move: z.string().nullable().optional(),
  cooldowns: z.record(z.string(), z.number()),
  updated_at: z.string(),
  simulation_clock_s: z.number().optional(),
  twin_event_seq: z.number().optional(),
  structural_stress_pct: z.number().optional(),
  aux_routing_pct: z.number().optional(),
  synchro_bandwidth_pct: z.number().optional(),
  simulated_damage_pct: z.number().optional(),
  overdrive_risk_pct: z.number().optional(),
  nova_readiness_pct: z.number().optional(),
  pilot_sync_pct: z.number().optional(),
  pilot_stress_pct: z.number().optional(),
  pilot_recognition_status: z.string().optional(),
  pilot_biometric_confidence_pct: z.number().optional(),
})

/** Primary export name (ISO / observability docs) — same shape as HUD telemetry. */
export type SKLTelemetryState = z.infer<typeof mechaHudStateSchema>

export const mazinkaiserCinematicScaleProfileSchema = z.object({
  height_meters: z.number(),
  weight_metric_tons: z.number(),
  shoulder_width_meters: z.number(),
  chest_width_meters: z.number(),
  arm_length_meters: z.number(),
  leg_length_meters: z.number(),
  foot_length_meters: z.number(),
  head_height_meters: z.number(),
  kaiser_blade_length_meters: z.number(),
  scrander_wingspan_meters: z.number(),
  cockpit_length_meters: z.number(),
  movement_profile: z.string(),
  reactor_class: z.string(),
  design_philosophy: z.string(),
})

export type MazinkaiserCinematicScaleProfileWire = z.infer<typeof mazinkaiserCinematicScaleProfileSchema>

export function parseTelemetryStrict(raw: unknown): SKLTelemetryState | null {
  const r = mechaHudStateSchema.safeParse(raw)
  return r.success ? r.data : null
}

/** Lenient parse: ensures core numeric gates; fills safe defaults for stress paths when partially missing. */
export function parseTelemetryLoose(raw: unknown): SKLTelemetryState | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.updated_at !== 'string') return null
  const r = mechaHudStateSchema.safeParse({
    ...o,
    photon_power_pct: num(o.photon_power_pct, 0),
    armor_integrity_pct: num(o.armor_integrity_pct, 0),
    heat_level_pct: num(o.heat_level_pct, 0),
    reactor_output_pct: num(o.reactor_output_pct, 0),
    sync_rate_pct: num(o.sync_rate_pct, 0),
    movement_ready: bool(o.movement_ready, false),
    tactical_alert: typeof o.tactical_alert === 'string' ? o.tactical_alert : '',
    energy_reserve_pct: num(o.energy_reserve_pct, 0),
    mode: typeof o.mode === 'string' ? o.mode : 'KAISER_CORE_MODE',
    cooldowns:
      o.cooldowns != null && typeof o.cooldowns === 'object' && !Array.isArray(o.cooldowns)
        ? (o.cooldowns as Record<string, number>)
        : {},
    updated_at: o.updated_at,
  })
  return r.success ? r.data : null
}

function num(v: unknown, d: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : d
}

function bool(v: unknown, d: boolean): boolean {
  return typeof v === 'boolean' ? v : d
}
