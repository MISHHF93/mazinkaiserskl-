import type { ReactNode } from 'react'

export type CockpitPanelVariant = 'plate' | 'hull'

type CockpitPanelProps = {
  title: string
  subtitle?: string
  badge?: string
  headerAction?: ReactNode
  children: ReactNode
  className?: string
  /** Default `hidden`; use `visible` for tall WebGL / reactor glow so hull is not clipped by panel chrome. */
  sectionOverflow?: 'hidden' | 'visible'
  /** Replaces default `p-3 sm:p-4` wrapper under the header. */
  contentClassName?: string
  /**
   * `hull` — twin hull instrument stack (rounded hull rim + inner projection well).
   * `plate` — legacy armored tile (sharp corners).
   */
  variant?: CockpitPanelVariant
  /**
   * When `variant="hull"`, wraps body in the inner hull projection rim. Disable for panels that draw their own hull shell
   * (e.g. SKL twin surface).
   */
  hullInnerChrome?: boolean
}

/** Armored glass command stack — Mazinkaiser plating + silver corner brackets (or hull instrument rim). */
export function CockpitPanel({
  title,
  subtitle,
  badge,
  headerAction,
  children,
  className = '',
  sectionOverflow = 'hidden',
  contentClassName = 'relative p-2.5 sm:p-3',
  variant = 'plate',
  hullInnerChrome = true,
}: CockpitPanelProps) {
  const shellOverflow =
    sectionOverflow === 'visible' ? 'overflow-visible' : 'overflow-hidden'

  const isHull = variant === 'hull'

  const shellRadius = isHull ? 'rounded-2xl' : 'rounded-[3px]'
  const shellBorder = isHull
    ? 'border-2 border-[color-mix(in_srgb,var(--color-mzk-plasma)_30%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-mzk-silver)_14%,transparent)]'
    : 'border border-[color-mix(in_srgb,var(--color-mzk-silver-dim)_52%,var(--color-mzk-plasma)_15%)]'

  const shellBg = isHull
    ? 'bg-gradient-to-b from-[color-mix(in_srgb,var(--color-mzk-black-raised)_96%,black)] via-[color-mix(in_srgb,var(--color-mzk-black)_94%,black)] to-[color-mix(in_srgb,var(--color-mzk-black)_88%,#04060c)] shadow-[inset_0_0_52px_color-mix(in_srgb,var(--color-mzk-plasma)_12%,transparent),0_0_56px_rgba(0,0,0,0.72)]'
    : 'bg-[var(--color-cockpit-panel)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-mzk-silver)_18%,transparent),0_0_48px_rgba(0,0,0,0.65)]'

  const gradientOverlayRadius = isHull ? 'rounded-2xl' : 'rounded-[3px]'

  const cornerPos = isHull ? 'left-3 top-3' : 'left-2.5 top-2.5'
  const cornerPosR = isHull ? 'right-3 top-3' : 'right-2.5 top-2.5'
  const cornerPosBL = isHull ? 'bottom-3 left-3' : 'bottom-2.5 left-2.5'
  const cornerPosBR = isHull ? 'bottom-3 right-3' : 'bottom-2.5 right-2.5'

  const body =
    isHull && hullInnerChrome ? (
      <div className="relative px-1 pb-1 pt-0 sm:px-1.5 sm:pb-1.5">
        <div className="rounded-[1.05rem] border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_15%,transparent)] bg-[color-mix(in_srgb,black_48%,transparent)] p-[3px] shadow-[inset_0_0_48px_color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] sm:rounded-[1.15rem]">
          <div className={`rounded-[0.92rem] bg-[color-mix(in_srgb,var(--color-mzk-black-raised)_93%,black)] sm:rounded-[1.02rem] ${contentClassName}`}>
            {children}
          </div>
        </div>
      </div>
    ) : (
      <div className={contentClassName}>{children}</div>
    )

  return (
    <section
      className={`mzk-panel-skin relative ${shellOverflow} ${shellRadius} ${shellBorder} ${shellBg} backdrop-blur-md ${className}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${gradientOverlayRadius} opacity-[0.42]`}
        style={{
          background:
            'linear-gradient(152deg, color-mix(in srgb, var(--color-mzk-plasma-ice) 6%, transparent) 0%, transparent 38%, transparent 64%, color-mix(in srgb, var(--color-mzk-photon-red) 4%, transparent) 100%)',
        }}
      />

      <div
        className={`pointer-events-none absolute ${cornerPos} h-2 w-2 border-l-2 border-t-2 border-[color-mix(in_srgb,var(--color-mzk-gold-core)_55%,var(--color-mzk-silver)_25%)]`}
      />
      <div
        className={`pointer-events-none absolute ${cornerPosR} h-2 w-2 border-r-2 border-t-2 border-[color-mix(in_srgb,var(--color-mzk-silver-bright)_62%,var(--color-mzk-plasma)_12%)]`}
      />
      <div
        className={`pointer-events-none absolute ${cornerPosBL} h-2 w-2 border-b-2 border-l-2 border-[color-mix(in_srgb,var(--color-mzk-silver-dim)_52%,transparent)]`}
      />
      <div
        className={`pointer-events-none absolute ${cornerPosBR} h-2 w-2 border-b-2 border-r-2 border-[color-mix(in_srgb,var(--color-mzk-silver-dim)_52%,transparent)]`}
      />

      <header className="relative flex flex-wrap items-start justify-between gap-2 border-b border-[color-mix(in_srgb,var(--color-mzk-plasma)_16%,transparent)] px-2.5 py-2 sm:px-3 sm:py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-[family-name:var(--font-display)] truncate text-[11px] font-bold uppercase tracking-[0.22em] text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_94%,var(--color-mzk-plasma-ice))]">
              {title}
            </h2>
            {badge ? (
              <span className="rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-gold)_48%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black-plate)_90%,transparent)] px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-gold-core)_95%,white)] shadow-[0_0_14px_color-mix(in_srgb,var(--color-mzk-gold)_22%,transparent)]">
                {badge}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 text-[10px] leading-snug text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_92%,var(--color-mzk-plasma))]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {headerAction ? <div className="flex shrink-0 items-center gap-2">{headerAction}</div> : null}
      </header>
      {body}
    </section>
  )
}
