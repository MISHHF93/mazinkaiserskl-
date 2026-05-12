import type { MazinkaiserCinematicScaleProfile, MechaHudState, PersonalityMode } from '../types'
import { API_BASE } from '../config'
import {
  coerceCockpitEnvelope,
  coerceCockpitMoveDemoResponse,
  parseVoiceIngestResponse,
} from '@mazinkaiser/shared-types'

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
  const json: unknown = await r.json()
  const coerced = coerceCockpitEnvelope(json)
  if (coerced) {
    const out: CockpitEnvelope = {
      session_id: coerced.session_id,
      state: coerced.state,
    }
    if (coerced.cinematic_scale_profile !== undefined) {
      out.cinematic_scale_profile = coerced.cinematic_scale_profile
    }
    return out
  }
  if (import.meta.env.DEV) {
    console.warn('[api] GET /cockpit/state response shape drift — using unchecked JSON')
  }
  return json as CockpitEnvelope
}

export async function postMode(sessionId: string | null, mode: PersonalityMode) {
  const r = await fetch(`${prefix}/cockpit/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, mode }),
  })
  if (!r.ok) throw new Error(`mode ${r.status}`)
  const json: unknown = await r.json()
  const coerced = coerceCockpitEnvelope(json)
  if (coerced) {
    const out: CockpitEnvelope = {
      session_id: coerced.session_id,
      state: coerced.state,
    }
    if (coerced.cinematic_scale_profile !== undefined) {
      out.cinematic_scale_profile = coerced.cinematic_scale_profile
    }
    return out
  }
  if (import.meta.env.DEV) {
    console.warn('[api] POST /cockpit/mode response shape drift — using unchecked JSON')
  }
  return json as CockpitEnvelope
}

export async function postDiagnostics(sessionId?: string | null) {
  const u = new URL(`${prefix}/cockpit/diagnostics`, window.location.origin)
  if (sessionId) u.searchParams.set('session_id', sessionId)
  const r = await fetch(u.toString(), { method: 'POST' })
  if (!r.ok) throw new Error(`diagnostics ${r.status}`)
  const json: unknown = await r.json()
  const coerced = coerceCockpitEnvelope(json)
  if (coerced) {
    const out: CockpitEnvelope = {
      session_id: coerced.session_id,
      state: coerced.state,
    }
    if (coerced.cinematic_scale_profile !== undefined) {
      out.cinematic_scale_profile = coerced.cinematic_scale_profile
    }
    return out
  }
  if (import.meta.env.DEV) {
    console.warn('[api] POST /cockpit/diagnostics response shape drift — using unchecked JSON')
  }
  return json as CockpitEnvelope
}

export async function postMoveDemo(sessionId: string | null, move: string) {
  const r = await fetch(`${prefix}/cockpit/move-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, move }),
  })
  if (!r.ok) throw new Error(`move ${r.status}`)
  const json: unknown = await r.json()
  const coerced = coerceCockpitMoveDemoResponse(json)
  if (coerced) {
    const base: {
      session_id: string
      state: MechaHudState
      move_batch: Record<string, unknown>
      cinematic_scale_profile?: MazinkaiserCinematicScaleProfile
    } = {
      session_id: coerced.session_id,
      state: coerced.state,
      move_batch: (coerced.move_batch ?? {}) as Record<string, unknown>,
    }
    if (coerced.cinematic_scale_profile !== undefined) {
      base.cinematic_scale_profile = coerced.cinematic_scale_profile
    }
    return base
  }
  if (import.meta.env.DEV) {
    console.warn('[api] POST /cockpit/move-demo response shape drift — using unchecked JSON')
  }
  return json as {
    session_id: string
    state: MechaHudState
    move_batch: Record<string, unknown>
    cinematic_scale_profile?: MazinkaiserCinematicScaleProfile
  }
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

export type VoiceIngestResponse = import('@mazinkaiser/shared-types').VoiceIngestResponseWire

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
  const json: unknown = await r.json()
  const parsed = parseVoiceIngestResponse(json)
  if (parsed) return parsed
  if (import.meta.env.DEV) {
    console.warn('[api] POST /voice/ingest response shape drift — using unchecked JSON')
  }
  return json as VoiceIngestResponse
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

export type CockpitChatResponseWire = {
  session_id: string
  reply: string
  safety: string
  mode: string
  intent?: string | null
  move_batch?: Record<string, unknown> | null
}

/** REST cognitive chat (same handler as WebSocket `chat` when uplink is unavailable). */
export async function postCockpitChat(
  sessionId: string | null,
  text: string,
  mode?: string,
  includeSessionContext = false,
): Promise<CockpitChatResponseWire> {
  const r = await fetch(`${prefix}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      text,
      ...(mode ? { mode } : {}),
      include_session_context: includeSessionContext,
    }),
  })
  if (!r.ok) throw new Error(`chat ${r.status}`)
  return r.json() as Promise<CockpitChatResponseWire>
}
