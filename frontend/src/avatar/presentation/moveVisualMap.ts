import type { AnimationPlanCueWire, MoveVisualKind } from './types'

/**
 * Align demo button titles with REST `move_id` slugs (`Kaiser Move` enums on server).
 */

const MAP: Record<string, MoveVisualKind> = {
  'rocket-punch': 'thruster',
  'turbo-smasher-punch': 'melee',
  'rust-tornado': 'field',
  'fire-blaster': 'thermal',
  'koshiryoku-beam': 'beam',
  'kaiser-blade': 'blade',
  'final-kaiser-blade': 'blade',
  'kaiser-nova': 'nova',
  'scrander-boomerang': 'thruster',
  'mazin-field-simulation': 'field',
  wave: 'field',
  walk: 'thruster',
  salute: 'neutral',
}

export function labelToSlug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function resolveMoveVisualKind(params: {
  backendMoveId?: string | null
  label: string
}): MoveVisualKind {
  const key = (params.backendMoveId ?? labelToSlug(params.label)).toLowerCase()
  if (!key) return 'neutral'

  if (MAP[key]) return MAP[key]

  if (key.includes('nova')) return 'nova'
  if (key.includes('blade')) return 'blade'
  if (key.includes('beam') || key.includes('koshiryoku')) return 'beam'
  if (key.includes('fire') || key.includes('blaster')) return 'thermal'
  if (key.includes('tornado') || key.includes('field')) return 'field'
  if (key.includes('rocket') || key.includes('punch')) return 'thruster'
  if (key.includes('scrander') || key.includes('boomerang')) return 'thruster'
  return 'neutral'
}

/** Coerce API JSON rows into typed cues for SKL playback + HUD. */
export function normalizeAnimationPlan(raw: readonly Record<string, unknown>[]): AnimationPlanCueWire[] {
  const out: AnimationPlanCueWire[] = []
  for (const p of raw) {
    const phase = typeof p.phase === 'string' ? p.phase : ''
    const hud_event = typeof p.hud_event === 'string' ? p.hud_event : ''
    const duration_ms =
      typeof p.duration_ms === 'number' && Number.isFinite(p.duration_ms) ? Math.max(0, p.duration_ms) : 0
    const sevRaw = typeof p.severity === 'string' ? p.severity : 'info'
    const severity: AnimationPlanCueWire['severity'] =
      sevRaw === 'warn' || sevRaw === 'critical' ? sevRaw : 'info'
    const payload =
      p.payload != null && typeof p.payload === 'object' && !Array.isArray(p.payload)
        ? (p.payload as Record<string, unknown>)
        : {}
    out.push({ phase, hud_event, duration_ms, severity, payload })
  }
  return out
}

export function severitiesFromAnimationPlan(
  plan: readonly Record<string, unknown>[],
): Array<'info' | 'warn' | 'critical'> {
  const out: Array<'info' | 'warn' | 'critical'> = []
  for (const p of plan) {
    const ev = typeof p.hud_event === 'string' ? p.hud_event : ''
    const sev = typeof p.severity === 'string' ? p.severity : ''
    if (sev === 'critical' || ev.includes('critical') || ev.includes('.crit')) out.push('critical')
    else if (sev === 'warn' || ev.includes('.warn')) out.push('warn')
    else out.push('info')
  }
  return out
}
