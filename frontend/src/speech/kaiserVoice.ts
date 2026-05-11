/**
 * Mazinkaiser cockpit voice — browser SpeechSynthesis voice pick + prosody.
 * Voices are OS/browser-specific; we score available voices for a baritone / "mechanism" feel.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
 */

/** Default prosody when a Mechanism voice is selected (slightly slow, lower pitch). */
export const MAZINKAISER_TTS_PROSODY = {
  rate: 0.93,
  pitch: 0.86,
  volume: 1,
} as const

const PREFERRED_NAME_SUBSTRINGS = [
  'david',
  'daniel',
  'mark',
  'george',
  'fred',
  'james',
  'aaron',
  'richard',
  'tom',
  'arthur',
  'gordon',
  'male',
  'microsoft george',
  'google uk english male',
  'microsoft david',
] as const

const AVOID_NAME_SUBSTRINGS = [
  'female',
  'zira',
  'samantha',
  'susan',
  'karen',
  'linda',
  'heather',
  'sonia',
  'veena',
  'fiona',
  'catherine',
  'martha',
  'ivy',
  'sarah',
  'victoria',
] as const

export function scoreVoiceForMazinkaiser(v: SpeechSynthesisVoice): number {
  const name = `${v.name} ${v.voiceURI}`.toLowerCase()
  const lang = (v.lang || '').toLowerCase()
  let s = 0
  if (lang.startsWith('en')) s += 4
  for (const bad of AVOID_NAME_SUBSTRINGS) {
    if (name.includes(bad)) s -= 12
  }
  for (const good of PREFERRED_NAME_SUBSTRINGS) {
    if (name.includes(good)) s += 6
  }
  if (v.default) s += 1
  return s
}

/** Pick best-effort voice for in-character TTS, or null if the list is empty. */
export function pickMazinkaiserVoice(voices: ReadonlyArray<SpeechSynthesisVoice>): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  let best: SpeechSynthesisVoice | null = null
  let bestScore = -Infinity
  for (const v of voices) {
    const sc = scoreVoiceForMazinkaiser(v)
    if (sc > bestScore) {
      bestScore = sc
      best = v
    }
  }
  return best
}

let cachedMazinkaiserVoice: SpeechSynthesisVoice | null | undefined

function invalidateVoiceCache(): void {
  cachedMazinkaiserVoice = undefined
}

/**
 * Resolve a voice (cached). Call after `voiceschanged` / on cockpit mount.
 */
export function getResolvedMazinkaiserVoice(): SpeechSynthesisVoice | null {
  if (cachedMazinkaiserVoice !== undefined) return cachedMazinkaiserVoice
  const voices = typeof window !== 'undefined' ? window.speechSynthesis.getVoices() : []
  cachedMazinkaiserVoice = pickMazinkaiserVoice(voices)
  return cachedMazinkaiserVoice
}

/** Subscribe until voices load (Chrome loads them asynchronously). Returns unsubscribe. */
export function subscribeMazinkaiserVoicesReady(onReady: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const synth = window.speechSynthesis
  const run = () => {
    invalidateVoiceCache()
    void getResolvedMazinkaiserVoice()
    onReady()
  }
  run()
  synth.addEventListener('voiceschanged', run)
  return () => synth.removeEventListener('voiceschanged', run)
}

/** Light cleanup so assistant replies sound spoken, not like raw markdown. */
export function stripLiteForTts(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
