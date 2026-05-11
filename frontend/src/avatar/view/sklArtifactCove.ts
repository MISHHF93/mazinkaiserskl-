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
}

let lastBatches: SklArtifactBatchWire[] = []
let lastCoveUrl: string | null = null

export function getRegisteredArtifactBatches(): readonly SklArtifactBatchWire[] {
  return lastBatches
}

export function getLastAppliedCoveUrl(): string | null {
  return lastCoveUrl
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
