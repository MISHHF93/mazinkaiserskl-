import { useEffect, useMemo, useState } from 'react'
import { fetchKaiserGlbWithFallbacks, resolveKaiserGlbUrl } from '../constants'
import { parseGlbBuffer } from '../glb/parseGlb'
import { summarizeGltfJson } from '../glb/summarizeGltf'
import type { GltfInspectSummary } from '../glb/summarizeGltf'

type LoadPhase = 'idle' | 'fetching' | 'parsed' | 'error'

export type GlbInspectorStatus = 'loading' | 'ready' | 'error'

export function MazinkaiserGlbInspector(props: {
  /** Dev: skip network + parsing (empty slate). */
  forceError?: boolean
  onStatus?: (s: GlbInspectorStatus) => void
}) {
  const { forceError, onStatus } = props
  const url = useMemo(() => resolveKaiserGlbUrl(), [])
  const [phase, setPhase] = useState<LoadPhase>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [summary, setSummary] = useState<GltfInspectSummary | null>(null)
  const [bytesIn, setBytesIn] = useState(0)
  const [jsonChunkPreview, setJsonChunkPreview] = useState<{ text: string; totalChars: number } | null>(null)

  useEffect(() => {
    if (forceError) {
      onStatus?.('error')
      return
    }
    if (phase === 'parsed') onStatus?.('ready')
    else if (phase === 'error') onStatus?.('error')
    else onStatus?.('loading')
  }, [forceError, phase, onStatus])

  useEffect(() => {
    if (forceError) return

    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setPhase('fetching')
      setErrMsg(null)
      void (async () => {
        try {
          const res = await fetchKaiserGlbWithFallbacks()
          if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
          const total = res.headers.get('content-length')
          if (total) {
            const mb = (Number(total) / (1024 * 1024)).toFixed(1)
            if (!cancelled && import.meta.env.DEV) {
              console.info(`[GLB inspect] Downloading ~${mb} MiB (${resolveKaiserGlbUrl()} … fallbacks)`)
            }
          }
          const buf = await res.arrayBuffer()
          if (cancelled) return
          setBytesIn(buf.byteLength)

          const { json, binByteLength, jsonPreviewUtf8, jsonSourceUtf8Length } = parseGlbBuffer(buf)
          setJsonChunkPreview({ text: jsonPreviewUtf8, totalChars: jsonSourceUtf8Length })
          setSummary(summarizeGltfJson(json, binByteLength))
          setPhase('parsed')
        } catch (e) {
          if (cancelled) return
          setPhase('error')
          setErrMsg(e instanceof Error ? e.message : String(e))
        }
      })()
    })

    return () => {
      cancelled = true
    }
  }, [forceError])

  if (forceError) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-4 py-6">
        <p className="font-mono text-[11px] text-[color-mix(in_srgb,var(--color-mzk-warning-flare)_90%,white)]">
          Disabled (?avatar_fixture=glb-absent)
        </p>
        <p className="mt-2 max-w-md text-center font-mono text-[9px] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_78%,var(--color-mzk-plasma-ice)_12%)]">
          URL: <span className="break-all opacity-90">{url}</span>
        </p>
      </div>
    )
  }

  if (phase === 'fetching') {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 px-4 py-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_85%,white)]">
          Reading GLB container…
        </p>
        <p className="max-w-sm font-mono text-[10px] leading-relaxed text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_88%,var(--color-mzk-plasma-ice)_18%)]">
          Large files (50–100+ MiB) can take a minute. This panel parses the Khronos GLB header + embedded
          JSON only; the BIN chunk is measured but not decoded on the GPU.
        </p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-4 py-6">
        <p className="font-mono text-[11px] text-[color-mix(in_srgb,var(--color-mzk-warning-flare)_90%,white)]">
          {errMsg ?? 'Failed to load GLB'}
        </p>
        <p className="mt-2 max-w-md text-center font-mono text-[9px] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_78%,var(--color-mzk-plasma-ice)_12%)]">
          URL: <span className="break-all opacity-90">{url}</span>
        </p>
      </div>
    )
  }

  if (phase !== 'parsed' || !summary) {
    return null
  }

  const mb = (bytesIn / (1024 * 1024)).toFixed(2)

  return (
    <div className="flex h-full max-h-[min(72vh,820px)] min-h-0 flex-col gap-2 overflow-y-auto overflow-x-hidden px-2 py-2 sm:px-3">
      <header className="shrink-0 border-b border-[color-mix(in_srgb,var(--color-mzk-silver-dim)_22%,transparent)] pb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--color-mzk-gold-core)_75%,white)]">
          GLB 2.0 · structural review
        </p>
        <p className="mt-1 font-mono text-[9px] leading-relaxed text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_82%,var(--color-mzk-plasma-ice)_14%)]">
          File <strong>{mb} MiB</strong> · glTF asset <strong>{summary.assetVersion ?? '?'}</strong>
          {summary.generator ? ` · ${summary.generator}` : null}
        </p>
      </header>

      <dl className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-1 font-mono text-[9px] sm:grid-cols-3">
        <Count k="scenes" n={summary.counts.scenes} />
        <Count k="nodes" n={summary.counts.nodes} />
        <Count k="meshes" n={summary.counts.meshes} />
        <Count k="materials" n={summary.counts.materials} />
        <Count k="textures" n={summary.counts.textures} />
        <Count k="images" n={summary.counts.images} />
        <Count k="accessors" n={summary.counts.accessors} />
        <Count k="bufferViews" n={summary.counts.bufferViews} />
        <Count k="buffers" n={summary.counts.buffers} />
        <Count k="skins" n={summary.counts.skins} />
        <Count k="animations" n={summary.counts.animations} />
      </dl>

      <section className="shrink-0 font-mono text-[9px] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_75%,var(--color-mzk-silver))]">
        <span className="text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_90%,white)]">Accessors:</span>{' '}
        sc {summary.accessorKinds.scalar} · v2 {summary.accessorKinds.vec2} · v3 {summary.accessorKinds.vec3} · v4{' '}
        {summary.accessorKinds.vec4} · mat {summary.accessorKinds.mat}
        {summary.accessorKinds.other ? ` · other ${summary.accessorKinds.other}` : null}
      </section>

      {summary.extensionsUsed.length > 0 ?
        <section className="shrink-0 font-mono text-[9px]">
          <span className="text-[color-mix(in_srgb,var(--color-mzk-gold-core)_70%,white)]">extensionsUsed:</span>{' '}
          <span className="text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_78%,white)]">
            {summary.extensionsUsed.join(', ')}
          </span>
        </section>
      : null}

      {summary.warnings.length > 0 ?
        <ul className="shrink-0 list-inside list-disc space-y-1 rounded-md border border-[color-mix(in_srgb,var(--color-mzk-warning-orange)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black)_88%,var(--color-mzk-warning-orange)_8%)] px-2 py-2 font-mono text-[9px] text-[color-mix(in_srgb,var(--color-mzk-warning-flare)_92%,white)]">
          {summary.warnings.map((w) => (
            <li key={w.slice(0, 48)} className="leading-snug">
              {w}
            </li>
          ))}
        </ul>
      : null}

      {summary.animationSummary.length > 0 ?
        <section>
          <h4 className="mb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_80%,var(--color-mzk-gold)_20%)]">
            Animations
          </h4>
          <ul className="font-mono text-[9px] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_80%,white)]">
            {summary.animationSummary.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      : null}

      <section className="min-h-0 flex-1">
        <h4 className="mb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_80%,var(--color-mzk-gold)_20%)]">
          Default scene · node tree
        </h4>
        <pre className="max-h-48 overflow-auto rounded-md border border-[color-mix(in_srgb,var(--color-mzk-silver-dim)_26%,transparent)] bg-black/35 p-2 font-mono text-[9px] leading-relaxed text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)] whitespace-pre-wrap">
          {summary.nodeTree}
        </pre>
      </section>

      <details className="shrink-0 border-t border-[color-mix(in_srgb,var(--color-mzk-silver-dim)_18%,transparent)] pt-2">
        <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-gold-core)_65%,var(--color-mzk-plasma-ice)_35%)]">
          Embedded glTF JSON chunk preview ({jsonChunkPreview ? `${jsonChunkPreview.totalChars.toLocaleString()} chars` : '—'})
        </summary>
        <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-black/45 p-2 font-mono text-[8px] leading-tight text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_82%,white)]">
          {jsonChunkPreview?.text ?? ''}
        </pre>
      </details>
    </div>
  )
}

function Count({ k, n }: { k: string; n: number }) {
  return (
    <div className="flex justify-between gap-2 border-b border-[color-mix(in_srgb,var(--color-mzk-silver-dim)_12%,transparent)] border-dotted pb-0.5 text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_65%,var(--color-mzk-silver-dim))]">
      <dt>{k}</dt>
      <dd className="text-[color-mix(in_srgb,var(--color-mzk-gold-core)_80%,white)]">{n}</dd>
    </div>
  )
}
