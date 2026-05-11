import type { MazinkaiserCinematicScaleProfile, MechaHudState, PersonalityMode } from '../types'
import { API_BASE } from '../config'

const prefix = `${API_BASE}/api/v1`

export type CockpitEnvelope = {
  session_id: string
  state: MechaHudState
  cinematic_scale_profile?: MazinkaiserCinematicScaleProfile
}

export async function fetchState(sessionId?: string | null): Promise<CockpitEnvelope> {
  const u = new URL(`${prefix}/cockpit/state`, window.location.origin)
  if (sessionId) u.searchParams.set('session_id', sessionId)
  const r = await fetch(u.toString())
  if (!r.ok) throw new Error(`state ${r.status}`)
  return r.json() as Promise<CockpitEnvelope>
}

export async function postMode(sessionId: string | null, mode: PersonalityMode) {
  const r = await fetch(`${prefix}/cockpit/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, mode }),
  })
  if (!r.ok) throw new Error(`mode ${r.status}`)
  return r.json() as Promise<CockpitEnvelope>
}

export async function postDiagnostics(sessionId?: string | null) {
  const u = new URL(`${prefix}/cockpit/diagnostics`, window.location.origin)
  if (sessionId) u.searchParams.set('session_id', sessionId)
  const r = await fetch(u.toString(), { method: 'POST' })
  if (!r.ok) throw new Error(`diagnostics ${r.status}`)
  return r.json() as Promise<CockpitEnvelope>
}

export async function postMoveDemo(sessionId: string | null, move: string) {
  const r = await fetch(`${prefix}/cockpit/move-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, move }),
  })
  if (!r.ok) throw new Error(`move ${r.status}`)
  return r.json() as Promise<{
    session_id: string
    state: MechaHudState
    move_batch: Record<string, unknown>
    cinematic_scale_profile?: MazinkaiserCinematicScaleProfile
  }>
}

export async function fetchTactical() {
  const r = await fetch(`${prefix}/cockpit/tactical`)
  if (!r.ok) throw new Error(`tactical ${r.status}`)
  return r.json() as Promise<{
    threats_ranked: { id: string; class: string; priority: number }[]
    recommended_defense: string
    environment: string
    prediction: string
  }>
}

export type SessionConfig = {
  session_id: string
  pilot_display_name: string | null
  pilot_callsign: string | null
  wake_strip_enabled: boolean
  wake_prefixes: string[]
}

export async function fetchSessionConfig(sessionId?: string | null): Promise<SessionConfig> {
  const u = new URL(`${prefix}/cockpit/session`, window.location.origin)
  if (sessionId) u.searchParams.set('session_id', sessionId)
  const r = await fetch(u.toString())
  if (!r.ok) throw new Error(`session get ${r.status}`)
  return r.json() as Promise<SessionConfig>
}

export type VoiceIngestResponse = {
  session_id: string
  raw_transcript: string
  normalized_text: string
  stt_provider: string
  intent: string | null
  parsed: { verb: string; tokens: string[]; confidence: number }
  tts_hints: Record<string, unknown>
  wake_routing: Record<string, unknown>
}

export async function postVoiceIngest(
  sessionId: string | null,
  transcript: string,
  executeTurn = false,
): Promise<VoiceIngestResponse> {
  const r = await fetch(`${prefix}/voice/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      transcript,
      execute_turn: executeTurn,
      source: 'browser_webspeech',
    }),
  })
  if (!r.ok) throw new Error(`voice ingest ${r.status}`)
  return r.json() as Promise<VoiceIngestResponse>
}

export async function putSessionConfig(
  sessionId: string | null,
  patch: Partial<{
    pilot_display_name: string | null
    pilot_callsign: string | null
    wake_strip_enabled: boolean
    wake_prefixes: string[]
  }>,
): Promise<SessionConfig> {
  const u = new URL(`${prefix}/cockpit/session`, window.location.origin)
  if (sessionId) u.searchParams.set('session_id', sessionId)
  const r = await fetch(u.toString(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!r.ok) throw new Error(`session put ${r.status}`)
  return r.json() as Promise<SessionConfig>
}
