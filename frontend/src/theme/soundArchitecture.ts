/**
 * Future audio layer — categorized hooks for reactor / cockpit / tactical SFX.
 * Wire Web Audio or FMOD/Wwise bridges without touching UI components.
 * Pair with waveform → **MechanicalSpeakRig** (see `deriveMechanicalSpeakSnapshot`, **`docs/CINEMATIC_AVATAR.md`**).
 */

export type MazinkaiserSoundCategory =
  | 'reactor_hum'
  | 'cockpit_ambience'
  | 'tactical_beep'
  | 'warning_alarm'
  | 'sync_tone'
  | 'energy_charge'
  | 'metal_activation'
  /** Voice layer direction: authoritative Kaiser Core persona */
  | 'voice_authority_pad'

/** Reserved channel ids for deterministic mixing precedence. */
export const MAZINKAISER_MIXER_ORDER = [
  'reactor_hum',
  'cockpit_ambience',
  'tactical_beep',
  'warning_alarm',
  'sync_tone',
  'energy_charge',
  'metal_activation',
  'voice_authority_pad',
] as const satisfies readonly MazinkaiserSoundCategory[]

export type SoundIntent =
  | { category: 'reactor_hum'; intensity: number }
  | { category: 'warning_alarm'; severity: 'heat' | 'nova' | 'critical' }

/** No-op scheduler until a bank is mounted. */
export function scheduleMazinkaiserSound(intent: SoundIntent): void {
  void intent
  /* Future: enqueue in AudioContext graph gated by pilot consent + mute flags */
}
