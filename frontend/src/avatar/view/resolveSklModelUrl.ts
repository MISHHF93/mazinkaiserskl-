/* eslint-disable react-hooks/set-state-in-effect -- probe begins in "checking" before async resolve */
import { useEffect, useState } from 'react'
import {
  collectKaiserGlbAbsoluteUrlCandidates,
  collectKaiserGlbUrlCandidates,
} from '../constants'

export type SklGlbResolution =
  | { phase: 'idle' | 'checking'; url: null; tried: string[]; error: null }
  | { phase: 'ready'; url: string; tried: string[]; error: null }
  | { phase: 'missing'; url: null; tried: string[]; error: string }

async function firstReachableUrl(
  urls: string[],
  signal?: AbortSignal,
): Promise<{ url: string } | null> {
  const req = (): RequestInit => ({
    method: 'GET',
    headers: { Range: 'bytes=0-0' },
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  })
  for (const url of urls) {
    try {
      const r = await fetch(url, req())
      if (r.ok || r.status === 206 || r.status === 200) return { url }
      const h = await fetch(url, { method: 'HEAD', cache: 'no-store', ...(signal ? { signal } : {}) })
      if (h.ok) return { url }
    } catch {
      /* try next */
    }
  }
  return null
}

export async function resolveKaiserGlbModelUrl(opts: {
  forceError?: boolean
  signal?: AbortSignal
}): Promise<Exclude<SklGlbResolution, { phase: 'idle' | 'checking' }>> {
  const tried = collectKaiserGlbAbsoluteUrlCandidates()
  if (opts.forceError) {
    return {
      phase: 'missing',
      url: null,
      tried,
      error: 'GLB load disabled (fixture / forced error).',
    }
  }

  const raw = import.meta.env.VITE_KAISER_GLB_URL
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const url = raw.trim()
    return { phase: 'ready', url, tried: [url], error: null }
  }

  const hit = await firstReachableUrl(tried, opts.signal)
  if (hit) {
    return { phase: 'ready', url: hit.url, tried, error: null }
  }

  return {
    phase: 'missing',
    url: null,
    tried,
    error:
      `No GLB found. Run \`npm run sync:skl-glb\` or \`npm run dev\` so repo-root mazinkaiser_skl.glb is copied to frontend/public/models/. Browser URL: ${collectKaiserGlbUrlCandidates()[0]}`,
  }
}

export function useKaiserGlbModelResolution(forceError?: boolean): SklGlbResolution {
  const [res, setRes] = useState<SklGlbResolution>({
    phase: 'idle',
    url: null,
    tried: [],
    error: null,
  })
  useEffect(() => {
    const ac = new AbortController()
    const tried = collectKaiserGlbAbsoluteUrlCandidates()
    setRes({ phase: 'checking', url: null, tried, error: null })
    void resolveKaiserGlbModelUrl({ forceError: !!forceError, signal: ac.signal }).then((r) => {
      if (!ac.signal.aborted) setRes(r)
    })
    return () => ac.abort()
  }, [forceError])
  return res
}
