/** Mirrors `GET /cockpit/state` → `cinematic_scale_profile` (snake_case, cinematic twin scale). */
export type MazinkaiserCinematicScaleProfile = {
  height_meters: number
  weight_metric_tons: number
  shoulder_width_meters: number
  chest_width_meters: number
  arm_length_meters: number
  leg_length_meters: number
  foot_length_meters: number
  head_height_meters: number
  kaiser_blade_length_meters: number
  scrander_wingspan_meters: number
  cockpit_length_meters: number
  movement_profile: string
  reactor_class: string
  design_philosophy: string
}

/** Fallback when WS/REST omits profile (offline or older backend). Matches `mazinkaiser.domain.cinematic_scale`. */
export const MAZINKAISER_CINEMATIC_SCALE_FALLBACK: MazinkaiserCinematicScaleProfile = {
  height_meters: 32,
  weight_metric_tons: 280,
  shoulder_width_meters: 14,
  chest_width_meters: 10,
  arm_length_meters: 13,
  leg_length_meters: 16,
  foot_length_meters: 6.5,
  head_height_meters: 4.5,
  kaiser_blade_length_meters: 22,
  scrander_wingspan_meters: 52,
  cockpit_length_meters: 4.2,
  movement_profile: 'Heavy Super Robot',
  reactor_class: 'Catastrophic Photon Reactor',
  design_philosophy:
    'Cinematic scale: overwhelmingly massive, reactor-heavy armor and city-dominating presence — not strict OVA/SRW databook numbers.',
}

/** Mirrors `MechaState.model_dump_json_safe` — extra fields optional for older backends. */
export type MechaHudState = {
  photon_power_pct: number
  armor_integrity_pct: number
  heat_level_pct: number
  reactor_output_pct: number
  sync_rate_pct: number
  movement_ready: boolean
  tactical_alert: string
  energy_reserve_pct: number
  /** Personality mode (Kaiser Core, Tactical, …). */
  mode: string
  /** Twin operational posture (idle, engaged, …). */
  operational_state?: string
  scrander_status?: string
  pilder_docking_status?: string
  movement_state?: string
  alerts_active?: string[]
  last_demo_move?: string | null
  cooldowns: Record<string, number>
  updated_at: string
  simulation_clock_s?: number
  twin_event_seq?: number
  structural_stress_pct?: number
  aux_routing_pct?: number
  synchro_bandwidth_pct?: number
  simulated_damage_pct?: number
  overdrive_risk_pct?: number
  nova_readiness_pct?: number
  pilot_sync_pct?: number
  pilot_stress_pct?: number
  pilot_recognition_status?: string
  pilot_biometric_confidence_pct?: number
}

export type PersonalityMode =
  | 'PROFESSOR_MODE'
  | 'GUARDIAN_MODE'
  | 'ENGINEER_MODE'
  | 'TACTICAL_MODE'
  | 'PILOT_ASSIST_MODE'
  | 'KAISER_CORE_MODE'
  | 'OVERDRIVE_WARNING_MODE'

export const PERSONALITY_MODES: PersonalityMode[] = [
  'KAISER_CORE_MODE',
  'PILOT_ASSIST_MODE',
  'TACTICAL_MODE',
  'OVERDRIVE_WARNING_MODE',
  'ENGINEER_MODE',
  'GUARDIAN_MODE',
  'PROFESSOR_MODE',
]

export const KAISER_MOVES = [
  'Rocket Punch',
  'Turbo Smasher Punch',
  'Rust Tornado',
  'Fire Blaster',
  'Koshiryoku Beam',
  'Kaiser Blade',
  'Final Kaiser Blade',
  'Kaiser Nova',
  'Scrander Boomerang',
  'Mazin Field Simulation',
] as const
