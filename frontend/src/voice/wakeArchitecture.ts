/**
 * Wake phrase placeholder — aligns with `/cockpit/session` `wake_prefixes` + backend
 * `normalize_pilot_utterance`. Future: WASM keyword spotting / always-on classifier.
 */

export interface WakeArchitectureConfig {
  /** Local gate before sending transcripts to Kaiser Core (mirror server stripping). */
  strictLocalGate: boolean
  /** Prefixes loaded from session config — server remains source of truth. */
  serverPrefixesFallback: readonly string[]
}

export const DEFAULT_WAKE_PREFIXES = [
  'Kaiser,',
  'Kaiser:',
  'Hey Kaiser,',
] as const

export function normalizeWakeSnippet(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}
