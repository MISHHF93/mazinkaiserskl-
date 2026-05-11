/**
 * Canonical runtime URL path (Vite serves `frontend/public/` at site root).
 * Browser loads: `${BASE_URL}models/mazinkaiser_skl.glb`
 * Filesystem: `frontend/public/models/mazinkaiser_skl.glb` (populated by `npm run sync:skl-glb` from repo root).
 */
export const MAZINKAISER_SKL_GLB_PRIMARY_BASENAME = 'mazinkaiser_skl.glb' as const

/** Legacy copy still produced by sync for older bookmarks. */
export const MAZINKAISER_SKL_GLB_LEGACY_BASENAME = 'mazinkaiser-skl.glb' as const

/** @deprecated Alias — same as primary basename. */
export const MAZINKAISER_SKL_GLB_BASENAME = MAZINKAISER_SKL_GLB_PRIMARY_BASENAME

const base = () => (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/')

/** Primary: `/models/mazinkaiser_skl.glb` — use this everywhere for the SKL hull. */
export const MAZINKAISER_SKL_GLB_MODELS_PRIMARY_URL = () =>
  `${base()}models/${MAZINKAISER_SKL_GLB_PRIMARY_BASENAME}`

/** Legacy: `/models/mazinkaiser-skl.glb` */
export const MAZINKAISER_SKL_GLB_MODELS_LEGACY_URL = () =>
  `${base()}models/${MAZINKAISER_SKL_GLB_LEGACY_BASENAME}`

/**
 * Canonical same-origin path string shown in UI (relative to dev server root).
 */
export const MAZINKAISER_SKL_GLB_PUBLIC_URL = MAZINKAISER_SKL_GLB_MODELS_PRIMARY_URL()

/**
 * Hull panel: one mesh pipeline — on disk keep the GLB at the monorepo root next to `frontend/`
 * (for example `…\Mazinkaiser AI\mazinkaiser_skl.glb` on Windows). The browser loads `/models/mazinkaiser_skl.glb`.
 *
 * Cockpit `CockpitPanel` subtitle switches with the optional structure report (see `ImageAvatarViewer`).
 */
/** Primary hull experience: WebGL viewport; structure report is collapsed. */
export const MAZINKAISER_SKL_COCKPIT_SUBTITLE_VIEWPORT =
  'WebGL GLB preview (Three.js) · hull from /models/ (synced from repo root via npm run dev) · optional GLB structure report below'
/** Structure report expanded — Khronos parse + summary only (no WebGL in that panel). */
export const MAZINKAISER_SKL_COCKPIT_SUBTITLE_STRUCTURE =
  'Khronos GLB 2.0 · container parse · scene / material / accessor summary (CPU-side inspection only; no WebGL draw in this report)'

/** Public Meshy model page (human link — not a GLTF binary). */
export const MAZINKAISER_MESHY_SHARE =
  'https://www.meshy.ai/3d-models/Mazinkaiser-v2-019e0b27-71f6-7a85-b3e9-fbf6eafd9de2?utm_medium=referral-program&utm_source=meshy&utm_content=TYKH15&share_type=3d-models'

/** Public Tripo3D studio page (human link — export `.glb` from Tripo). */
export const KAISER_HULL_TRIPO_STUDIO =
  'https://studio.tripo3d.ai/3d-model/2020be3b-bf92-4954-b6f2-fae5a2c83ba6?invite_code=PQQM3F'

/** Same-origin absolute URL for fetches / loaders (no-op if already absolute). */
export function toAbsoluteAssetUrl(rel: string): string {
  if (typeof window === 'undefined') return rel
  if (/^https?:\/\//i.test(rel) || rel.startsWith('blob:')) return rel
  try {
    return new URL(rel, window.location.origin).href
  } catch {
    return rel
  }
}

/**
 * Load order: `VITE_KAISER_GLB_URL` if set, else `/models/mazinkaiser_skl.glb`, then legacy hyphen name.
 */
export function collectKaiserGlbUrlCandidates(): string[] {
  const raw = import.meta.env.VITE_KAISER_GLB_URL
  const t = typeof raw === 'string' ? raw.trim() : ''
  if (t.length > 0) return [t]
  return [MAZINKAISER_SKL_GLB_MODELS_PRIMARY_URL(), MAZINKAISER_SKL_GLB_MODELS_LEGACY_URL()]
}

/** Preferred absolute URL for display, inspector keys, and primary fetch. */
export function resolveKaiserGlbUrl(): string {
  return toAbsoluteAssetUrl(MAZINKAISER_SKL_GLB_MODELS_PRIMARY_URL())
}

export function collectKaiserGlbAbsoluteUrlCandidates(): string[] {
  return collectKaiserGlbUrlCandidates().map((u) => toAbsoluteAssetUrl(u))
}

/**
 * Fetch the Mazinkaiser SKL GLB — tries primary then legacy path.
 */
export async function fetchKaiserGlbWithFallbacks(init?: RequestInit): Promise<Response> {
  const urls = collectKaiserGlbAbsoluteUrlCandidates()
  let lastErr: Error | null = null
  for (const url of urls) {
    try {
      const res = await fetch(url, init)
      if (res.ok) return res
      lastErr = new Error(`HTTP ${res.status} ${res.statusText} — ${url}`)
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastErr ?? new Error('No GLB candidate URL could be fetched')
}
