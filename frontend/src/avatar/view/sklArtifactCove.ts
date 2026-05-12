import type { SklCueResonancePattern } from './sklClipMapping'
import { registerSklArtifactAliases, registerSklArtifactCuePatterns, registerSklArtifactIdleCandidates } from './sklClipMapping'

export type SklMoveArtifactsCraftsmanMeta = {
  rig?: string
  exportedBy?: string
  notes?: string
}

export type SklArtifactBatchWire = {
  id: string
  label?: string
  orderedMoveIds: string[]
  gapMs?: number
}

export type SklMoveArtifactsCoveV1 = {
  version: 1
  notes?: string
  craftsman?: SklMoveArtifactsCraftsmanMeta
  clipAliases?: Record<string, string>
  idleClipCandidates?: string[]
  cueResonance?: SklCueResonancePattern[]
  batches?: SklArtifactBatchWire[]
  /** Present when Cove JSON embeds backend ``write_monitored_publish_cove`` output (optional). */
  monitor?: SklResonanceMonitorWire
}

/** Subset of ``monitor.primary_hull`` from backend resonance emit. */
export type SklPrimaryHullWire = {
  mecha_hull_scope?: string
  hull_binding_mode?: string
  primary_glb_basename?: string
  primary_glb_byte_length?: number
  inspect_nodes_source_consistent?: boolean
}

/** Tier-D KPI gate bundle from backend ``build_kpi_tier_d_gate_bundle`` (``monitor.kpi_tier_d``). */
export type SklKpiTierDWire = {
  schema?: string
  tier_d_star?: number
  all_gates_passed?: boolean
  canonical_primary_glb_basename?: string
  primary_hull_basename?: string
  hull_binding_matches_canonical?: boolean
  gates?: Array<{
    id: string
    weight?: number
    signal?: number
    threshold?: number
    passed?: boolean
  }>
}

/** ``monitor`` block from ``mazinkaiser-artifacts.cove.monitor.json`` (SPA overlay). */
export type SklResonanceMonitorWire = {
  schema?: string
  generated_at?: string
  mean_resonance?: number
  scores_by_slug?: Record<string, number>
  model?: Record<string, unknown>
  identity?: Record<string, unknown>
  primary_hull?: SklPrimaryHullWire
  kpi_tier_d?: SklKpiTierDWire
}

let lastBatches: SklArtifactBatchWire[] = []
let lastCoveUrl: string | null = null
let lastResonanceMonitor: SklResonanceMonitorWire | null = null
let lastResonanceMonitorUrl: string | null = null

export function getRegisteredArtifactBatches(): readonly SklArtifactBatchWire[] {
  return lastBatches
}

export function getLastAppliedCoveUrl(): string | null {
  return lastCoveUrl
}

export function getSklResonanceMonitor(): SklResonanceMonitorWire | null {
  return lastResonanceMonitor
}

export function getLastAppliedResonanceMonitorUrl(): string | null {
  return lastResonanceMonitorUrl
}

/** Optional per-move score from ML/heuristic merge (undefined if overlay missing). */
export function getSklResonanceScoreForSlug(slug: string): number | undefined {
  const raw = lastResonanceMonitor?.scores_by_slug?.[slug]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined
}

function normalizeResonanceMonitor(mon: Record<string, unknown>): SklResonanceMonitorWire {
  const scoresRaw = mon.scores_by_slug
  const scores_by_slug: Record<string, number> = {}
  if (typeof scoresRaw === 'object' && scoresRaw !== null && !Array.isArray(scoresRaw)) {
    for (const [k, v] of Object.entries(scoresRaw as Record<string, unknown>)) {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) : Number.NaN
      scores_by_slug[k] = Number.isFinite(n) ? n : 0
    }
  }

  let mean_resonance = 0
  const m = mon.mean_resonance
  if (typeof m === 'number' && Number.isFinite(m)) {
    mean_resonance = m
  } else if (typeof m === 'string') {
    const p = Number.parseFloat(m)
    if (Number.isFinite(p)) mean_resonance = p
  }

  const model =
    typeof mon.model === 'object' && mon.model !== null && !Array.isArray(mon.model)
      ? (mon.model as Record<string, unknown>)
      : {}
  const identity =
    typeof mon.identity === 'object' && mon.identity !== null && !Array.isArray(mon.identity)
      ? (mon.identity as Record<string, unknown>)
      : {}

  const phRaw = mon.primary_hull
  let primary_hull: SklPrimaryHullWire | undefined
  if (typeof phRaw === 'object' && phRaw !== null && !Array.isArray(phRaw)) {
    const ph = phRaw as Record<string, unknown>
    const bn = ph.primary_glb_basename
    const bl = ph.primary_glb_byte_length
    primary_hull = {
      mecha_hull_scope: typeof ph.mecha_hull_scope === 'string' ? ph.mecha_hull_scope : 'unspecified',
      hull_binding_mode: typeof ph.hull_binding_mode === 'string' ? ph.hull_binding_mode : 'unspecified',
      primary_glb_basename: typeof bn === 'string' && bn.trim() !== '' ? bn : 'unknown',
      primary_glb_byte_length:
        typeof bl === 'number' && Number.isFinite(bl)
          ? bl
          : typeof bl === 'string'
            ? (() => {
                const x = Number.parseInt(bl, 10)
                return Number.isFinite(x) ? x : undefined
              })()
            : undefined,
      inspect_nodes_source_consistent:
        typeof ph.inspect_nodes_source_consistent === 'boolean' ? ph.inspect_nodes_source_consistent : undefined,
    }
    if (primary_hull.primary_glb_byte_length !== undefined && !Number.isFinite(primary_hull.primary_glb_byte_length)) {
      delete primary_hull.primary_glb_byte_length
    }
  }

  const schema =
    typeof mon.schema === 'string' && mon.schema.trim() !== ''
      ? mon.schema
      : 'ai-robot/publish-resonance-monitor/1'
  const generated_at = typeof mon.generated_at === 'string' ? mon.generated_at : ''

  let kpi_tier_d: SklKpiTierDWire | undefined
  const kRaw = mon.kpi_tier_d
  if (typeof kRaw === 'object' && kRaw !== null && !Array.isArray(kRaw)) {
    const kd = kRaw as Record<string, unknown>
    const gatesRaw = kd.gates
    const gates: SklKpiTierDWire['gates'] = []
    if (Array.isArray(gatesRaw)) {
      for (const g of gatesRaw) {
        if (typeof g !== 'object' || g === null || Array.isArray(g)) continue
        const o = g as Record<string, unknown>
        const id = typeof o.id === 'string' ? o.id : ''
        if (!id) continue
        gates.push({
          id,
          weight: typeof o.weight === 'number' ? o.weight : undefined,
          signal: typeof o.signal === 'number' ? o.signal : undefined,
          threshold: typeof o.threshold === 'number' ? o.threshold : undefined,
          passed: typeof o.passed === 'boolean' ? o.passed : undefined,
        })
      }
    }
    kpi_tier_d = {
      schema: typeof kd.schema === 'string' ? kd.schema : undefined,
      tier_d_star: typeof kd.tier_d_star === 'number' && Number.isFinite(kd.tier_d_star) ? kd.tier_d_star : undefined,
      all_gates_passed: typeof kd.all_gates_passed === 'boolean' ? kd.all_gates_passed : undefined,
      canonical_primary_glb_basename:
        typeof kd.canonical_primary_glb_basename === 'string' ? kd.canonical_primary_glb_basename : undefined,
      primary_hull_basename: typeof kd.primary_hull_basename === 'string' ? kd.primary_hull_basename : undefined,
      hull_binding_matches_canonical:
        typeof kd.hull_binding_matches_canonical === 'boolean' ? kd.hull_binding_matches_canonical : undefined,
      gates: gates.length ? gates : undefined,
    }
  }

  return {
    schema,
    generated_at,
    mean_resonance,
    scores_by_slug,
    model,
    identity,
    primary_hull,
    kpi_tier_d,
  }
}

function applySklResonanceMonitor(mon: SklResonanceMonitorWire): void {
  lastResonanceMonitor = mon
}

function baseUrlPrefix(): string {
  const b = import.meta.env.BASE_URL ?? '/'
  return b.replace(/\/?$/, '/')
}

/**
 * Fetch and apply a Cove bundle. Safe no-op on 404 / network error (viewer uses built-in mapping).
 * @param url — absolute or relative; default: `${BASE_URL}artifacts/mazinkaiser-move-artifacts.cove.json`
 */
export async function fetchAndApplySklMoveArtifactsCove(url?: string): Promise<boolean> {
  const resolved =
    url ?? `${baseUrlPrefix()}artifacts/mazinkaiser-move-artifacts.cove.json`
  lastCoveUrl = resolved
  try {
    const res = await fetch(resolved, { cache: 'no-store' })
    if (!res.ok) {
      if (import.meta.env.DEV) {
        console.debug(`[SKL Cove] No bundle at ${resolved} (${res.status}) — built-in clip map only.`)
      }
      return false
    }
    const data = (await res.json()) as SklMoveArtifactsCoveV1
    if (data.version !== 1) {
      console.warn('[SKL Cove] Unsupported version; expected 1:', data)
      return false
    }
    if (data.clipAliases && Object.keys(data.clipAliases).length > 0) {
      registerSklArtifactAliases(data.clipAliases)
    }
    if (data.idleClipCandidates?.length) {
      registerSklArtifactIdleCandidates(data.idleClipCandidates)
    }
    if (data.cueResonance !== undefined) {
      registerSklArtifactCuePatterns(data.cueResonance)
    }
    lastBatches = Array.isArray(data.batches) ? data.batches : []
    if (data.monitor && typeof data.monitor === 'object') {
      applySklResonanceMonitor(normalizeResonanceMonitor(data.monitor as Record<string, unknown>))
    }
    if (import.meta.env.DEV) {
      console.info(
        `[SKL Cove] Applied ${resolved} — aliases ${Object.keys(data.clipAliases ?? {}).length}, batches ${lastBatches.length}`,
      )
    }
    return true
  } catch (e) {
    if (import.meta.env.DEV) {
      console.debug('[SKL Cove] Load failed —', e)
    }
    return false
  }
}

/**
 * Load ``monitor`` (+ ``primary_hull``) overlay produced by the backend resonance pipeline.
 * Default: ``${BASE_URL}artifacts/mazinkaiser-artifacts.cove.monitor.json`` (copy emitted file into
 * ``frontend/public/artifacts/`` after ``python scripts/emit_resonance_monitored_cove.py``).
 */
export async function fetchAndApplySklResonanceMonitor(url?: string): Promise<boolean> {
  const resolved =
    typeof url === 'string' && url.trim() !== ''
      ? url.trim()
      : `${baseUrlPrefix()}artifacts/mazinkaiser-artifacts.cove.monitor.json`
  lastResonanceMonitorUrl = resolved
  try {
    const res = await fetch(resolved, { cache: 'no-store' })
    if (!res.ok) {
      if (import.meta.env.DEV) {
        console.debug(`[SKL Resonance] No overlay at ${resolved} (${res.status}).`)
      }
      lastResonanceMonitor = null
      return false
    }
    const root = (await res.json()) as Record<string, unknown>
    const mon = root.monitor
    if (!mon || typeof mon !== 'object') {
      if (import.meta.env.DEV) {
        console.warn('[SKL Resonance] JSON has no monitor block — expected merged Cove output.', root)
      }
      lastResonanceMonitor = null
      return false
    }
    applySklResonanceMonitor(normalizeResonanceMonitor(mon as Record<string, unknown>))
    if (import.meta.env.DEV) {
      console.info(
        `[SKL Resonance] Applied overlay from ${resolved} mean=${String(lastResonanceMonitor?.mean_resonance)}`,
      )
    }
    return true
  } catch (e) {
    if (import.meta.env.DEV) {
      console.debug('[SKL Resonance] Overlay load failed —', e)
    }
    lastResonanceMonitor = null
    return false
  }
}
