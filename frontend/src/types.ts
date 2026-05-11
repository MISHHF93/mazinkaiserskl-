import type {
  MazinkaiserCinematicScaleProfileWire,
  SKLTelemetryState,
} from '@mazinkaiser/shared-types'

/** Mirrors `GET /cockpit/state` → `cinematic_scale_profile` (snake_case, cinematic twin scale). */
export type MazinkaiserCinematicScaleProfile = MazinkaiserCinematicScaleProfileWire

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

/** HUD twin snapshot — canonical shape: `@mazinkaiser/shared-types` `SKLTelemetryState`. */
export type MechaHudState = SKLTelemetryState

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
