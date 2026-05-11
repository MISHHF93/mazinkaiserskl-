import { MAZINKAISER_SKL_GLB_BASENAME, MAZINKAISER_SKL_GLB_PUBLIC_URL } from '../constants'

export function GlbHullMissingNotice(props: { variant?: 'panel' | 'compact' }) {
  const { variant = 'panel' } = props
  const compact = variant === 'compact'

  return (
    <section
      className={`relative z-[18] mx-auto w-full rounded-lg border border-[color-mix(in_srgb,var(--color-mzk-warning-flare)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black)_86%,var(--color-mzk-warning-orange)_10%)] text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_93%,var(--color-mzk-warning-flare))] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-mzk-reactor-white)_8%,transparent)] ${
        compact ? 'mb-2 px-3 py-2' : 'mb-3 px-4 py-3.5'
      }`}
      role="status"
      aria-live="polite"
      aria-labelledby="mzk-glberror-heading"
    >
      <h3
        id="mzk-glberror-heading"
        className={`font-mono font-semibold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--color-mzk-warning-flare)_98%,white)] ${compact ? 'text-[10px]' : 'text-[11px]'}`}
      >
        Mazinkaiser SKL file could not be loaded for review
      </h3>
      <p className={`mt-2 leading-relaxed ${compact ? 'text-[11px]' : 'text-[12px]'}`}>
        The cockpit loads the mesh from the same-origin URL{' '}
        <code className="font-mono">{MAZINKAISER_SKL_GLB_PUBLIC_URL}</code> (with legacy fallback under{' '}
        <code className="font-mono">/models/</code>). Optional override:{' '}
        <code className="font-mono">VITE_KAISER_GLB_URL</code> in <code className="font-mono">frontend/.env</code>{' '}
        must be a <strong>direct</strong> <code className="font-mono">.glb</code> URL with CORS allowed — not an HTML studio page.
      </p>
      <ol className={`mt-3 list-decimal space-y-2 ps-5 ${compact ? 'text-[11px]' : 'text-[12px]'} leading-snug marker:text-[color-mix(in_srgb,var(--color-mzk-gold-core)_82%,transparent)]`}>
        <li>
          <strong>Local file to use:</strong> place{' '}
          <code className="rounded px-1 font-mono text-[0.92em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_92%,white)]">
            {MAZINKAISER_SKL_GLB_BASENAME}
          </code>{' '}
          at your <strong>repository root</strong> (same folder as <code className="font-mono">frontend/</code>
          ), then run <code className="font-mono">npm run sync:skl-glb</code> from{' '}
          <code className="font-mono">frontend/</code> so it is copied into{' '}
          <code className="font-mono">public/models/</code>. Relative paths:
          <pre className="mt-1.5 overflow-x-auto rounded-md border border-[color-mix(in_srgb,var(--color-mzk-silver-dim)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black)_92%,transparent)] px-2.5 py-2 font-mono text-[11px] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,var(--color-mzk-silver-bright))]">
            {`${MAZINKAISER_SKL_GLB_BASENAME}   (repo root)\nfrontend/public/models/${MAZINKAISER_SKL_GLB_BASENAME}   → browser ${MAZINKAISER_SKL_GLB_PUBLIC_URL}`}
          </pre>
        </li>
        <li>
          Run <code className="font-mono">npm run dev</code> or <code className="font-mono">npm run sync:skl-glb</code> from{' '}
          <code className="font-mono">frontend/</code> — predev copies the repo-root GLB into{' '}
          <code className="font-mono">public/models/</code>.
        </li>
        <li>
          After changing <code className="font-mono">.env</code>, restart Vite and hard-refresh (Ctrl+F5).
        </li>
      </ol>
      <p className={`mt-3 border-t border-[color-mix(in_srgb,var(--color-mzk-warning-flare)_22%,transparent)] pt-3 font-mono text-[10px] leading-relaxed text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_88%,var(--color-mzk-reactor-white))]`}>
        <span className="text-[color-mix(in_srgb,var(--color-mzk-gold-ember)_75%,transparent)]">Review / QA:</span>{' '}
        <code className="text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_80%,white)]">?avatar_fixture=glb-absent</code>{' '}
        (dev only) forces this message — remove that query param for a real load test.
      </p>
    </section>
  )
}
