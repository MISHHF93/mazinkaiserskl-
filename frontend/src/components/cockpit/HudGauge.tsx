type HudGaugeProps = {
  label: string
  value: number
  accent?: string
}

export function HudGauge({
  label,
  value,
  accent = 'from-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_90%,transparent)] to-[color-mix(in_srgb,var(--color-mzk-plasma-violet)_82%,transparent)]',
}: HudGaugeProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="min-w-0">
      <div className="flex justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_88%,transparent)]">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_94%,var(--color-mzk-plasma-ice))]">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="relative mt-1.5 h-2 overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--color-mzk-black)_92%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_16%,transparent)]">
        <div className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-mzk-plasma)_14%,transparent),transparent_65%)]" />
        <div
          className={`relative h-full bg-gradient-to-r ${accent}`}
          style={{ width: `${pct}%` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_3px,rgba(0,0,0,0.2)_3px,rgba(0,0,0,0.2)_4px)] opacity-75 mix-blend-multiply" />
      </div>
    </div>
  )
}
