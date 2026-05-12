import type { VoiceIngestResponse } from '../lib/api'

export const HULL_VOICE_VIEWPORT_EVENT = 'mzk-hull-voice-viewport'

export type HullVoiceViewportDetail = {
  op: 'dolly' | 'reset_view' | 'fit' | 'camera_preset'
  factor?: number
  preset?: string
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Dispatch viewport ops to SKLModelViewer (document listener inside viewer + dolly rig). */
export function dispatchHullVoiceViewport(detail: HullVoiceViewportDetail) {
  document.dispatchEvent(new CustomEvent(HULL_VOICE_VIEWPORT_EVENT, { detail }))
}

/**
 * Applies NLU `actions` from ``POST /voice/ingest`` — catalog moves, ML demos, and viewport dolly/camera.
 * Returns a short human line for the HUD transcript chip.
 */
export function applyHullVoiceNluFromIngest(
  ing: VoiceIngestResponse,
  handlers: {
    runMove: (label: string) => void
    runMlDemoMove: (slug: string) => void
  },
): string {
  const nlu = ing.hull_voice_nlu
  if (!isRecord(nlu)) return ''
  const rawActs = nlu.actions
  const actions = Array.isArray(rawActs) ? rawActs : []
  const lines: string[] = []
  for (const a of actions) {
    if (!isRecord(a)) continue
    const t = a.type
    if (t === 'catalog_move' && typeof a.label === 'string') {
      handlers.runMove(a.label)
      lines.push(`Move · ${a.label}`)
    } else if (t === 'ml_demo' && typeof a.slug === 'string') {
      handlers.runMlDemoMove(a.slug)
      lines.push(`ML demo · ${a.slug}`)
    } else if (t === 'viewport' && typeof a.op === 'string') {
      const op = a.op as HullVoiceViewportDetail['op']
      if (op === 'dolly' && typeof a.factor === 'number') {
        dispatchHullVoiceViewport({ op: 'dolly', factor: a.factor })
        lines.push(a.factor >= 1 ? 'Hull · zoom out' : 'Hull · zoom in')
      } else if (op === 'reset_view') {
        dispatchHullVoiceViewport({ op: 'reset_view' })
        lines.push('Hull · reset view')
      } else if (op === 'fit') {
        dispatchHullVoiceViewport({ op: 'fit' })
        lines.push('Hull · fit')
      } else if (op === 'camera_preset' && typeof a.preset === 'string') {
        dispatchHullVoiceViewport({ op: 'camera_preset', preset: a.preset })
        lines.push(`Hull · camera · ${a.preset}`)
      }
    }
  }
  const nlp = ing.hull_voice_nlp
  const model =
    (isRecord(nlu) && typeof nlu.model_id === 'string' && nlu.model_id) ||
    (isRecord(nlp) && typeof nlp.model_id === 'string' && nlp.model_id) ||
    'hull-voice'
  if (!lines.length) return ''
  return `[Voice · ${model}] ${lines.join(' · ')}`
}

export function voiceIngestSuppressesChat(ing: VoiceIngestResponse): boolean {
  const nlu = ing.hull_voice_nlu
  if (!isRecord(nlu)) return false
  return Boolean(nlu.suppress_pilot_chat_dispatch)
}
