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

/** ``monitor`` block from ``mazinkaiser-artifacts.cove.monitor.json`` (SPA overlay). */
export type SklResonanceMonitorWire = {
  schema?: string
  generated_at?: string
  mean_resonance?: number
  scores_by_slug?: Record<string, number>
  model?: Record<string, unknown>
  identity?: Record<string, unknown>
  primary_hull?: SklPrimaryHullWire
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
      applySklResonanceMonitor(data.monitor)
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
    applySklResonanceMonitor(mon as SklResonanceMonitorWire)
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
