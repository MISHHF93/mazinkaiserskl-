import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

/** Angular SKL panel — aggressive corners, smoke gunmetal fill */
export const SIM_SKL_ANGULAR_PANEL =
  'relative [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,10px_100%,0_calc(100%-10px))] border border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_32%,var(--color-mzk-smoke-panel)_18%)] bg-[color-mix(in_srgb,var(--color-mzk-gunmetal)_88%,black)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-mzk-inferno-yellow)_12%,transparent)]'

/** Low-fill bezel — reads as machined HUD hull, not a floating OS window (hull deck + dock sheets). */
export const SIM_HUD_BEZEL_PANEL =
  'relative rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_28%,transparent)] bg-[color-mix(in_srgb,#03050c_76%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-mzk-plasma-ice)_12%,transparent),0_6px_28px_rgba(0,0,0,0.55)] backdrop-blur-xl before:pointer-events-none before:absolute before:left-3 before:right-3 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[color-mix(in_srgb,var(--color-mzk-plasma)_35%,transparent)] before:to-transparent'

/** @deprecated Prefer {@link SIM_HUD_BEZEL_PANEL}; kept as alias for existing imports. */
export const SIM_FLOAT_PANEL = SIM_HUD_BEZEL_PANEL

/** Bottom-left deck grip — mirrors corner bezel language of {@link HudActuatorCluster}. */
export function HudDeckGrip({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`relative flex flex-col gap-0.5 rounded-bl-[3px] border-b-2 border-l-2 border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_42%,transparent)] border-r-0 border-t-0 bg-[color-mix(in_srgb,#020308_62%,transparent)] px-1.5 py-1 pl-2 shadow-[inset_-1px_-1px_0_color-mix(in_srgb,var(--color-mzk-plasma)_8%,transparent)] backdrop-blur-md ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute right-1 top-0 h-px w-6 bg-gradient-to-l from-transparent to-[color-mix(in_srgb,var(--color-mzk-plasma)_38%,transparent)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-2 w-2 border-b border-l border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_55%,transparent)]"
      />
      {children}
    </div>
  )
}

/** Right-grip actuator rail: icons sit on corner bezel without full card wrapping. */
export function HudActuatorCluster({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`relative flex flex-wrap items-center justify-end gap-0.5 rounded-br-[3px] border-b-2 border-r-2 border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_42%,transparent)] border-l-0 border-t-0 bg-[color-mix(in_srgb,#020308_62%,transparent)] py-1 pl-1.5 pr-0.5 shadow-[inset_1px_-1px_0_color-mix(in_srgb,var(--color-mzk-plasma)_8%,transparent)] backdrop-blur-md ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_55%,transparent)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-px w-8 bg-gradient-to-r from-transparent to-[color-mix(in_srgb,var(--color-mzk-plasma)_40%,transparent)]"
      />
      {children}
    </div>
  )
}

/** Wedge sheet anchored to cockpit corner (SKL settings) — reads as HUD extension, not a tablet modal. */
export const SIM_HUD_POPOVER_SHEET = `${SIM_HUD_BEZEL_PANEL} max-h-[min(40dvh,440px)] w-[min(calc(100vw-1rem),380px)] overflow-y-auto overscroll-contain rounded-br-none border-b-[3px] border-b-[color-mix(in_srgb,var(--color-mzk-plasma)_38%,transparent)] p-2.5 font-mono text-[clamp(11px,2.6vw,13px)] leading-snug text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_94%,white)] sm:p-3 sm:w-[min(calc(100vw-1.5rem),420px)] after:pointer-events-none after:absolute after:left-0 after:right-0 after:top-0 after:z-[1] after:h-0.5 after:bg-gradient-to-r after:from-transparent after:via-[color-mix(in_srgb,var(--color-mzk-plasma)_45%,transparent)] after:to-transparent`

/** Throttle-strip row: one machined segment for collapsed hull directive + primary fire. */
export function HudSegmentRail({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={`flex min-h-0 w-full flex-wrap items-stretch gap-px rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_24%,transparent)] bg-[color-mix(in_srgb,black_68%,transparent)] p-px shadow-[inset_0_0_0_1px_rgba(0,0,0,0.55)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  )
}

export const SIM_HUD_RANGE =
  'h-3 w-full max-w-none cursor-pointer appearance-none rounded-none accent-[var(--color-mzk-plasma)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-mzk-plasma-ice)_18%,transparent)] [background:linear-gradient(90deg,transparent_0%,color-mix(in_srgb,var(--color-mzk-plasma)_20%,transparent)_50%,transparent_100%)] pointer-coarse:min-h-[2.75rem] sm:h-2.5 sm:pointer-coarse:min-h-10 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-none [&::-webkit-slider-runnable-track]:border [&::-webkit-slider-runnable-track]:border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_15%,transparent)] [&::-webkit-slider-runnable-track]:bg-black/85 [&::-webkit-slider-thumb]:mt-[-3px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[7px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[1px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_45%,white)] [&::-webkit-slider-thumb]:bg-[color-mix(in_srgb,var(--color-mzk-plasma)_55%,#0a0c12)] sm:[&::-webkit-slider-thumb]:mt-[-2px] sm:[&::-webkit-slider-thumb]:h-4 sm:[&::-webkit-slider-thumb]:w-2'

export const SIM_HUD_SELECT =
  'min-h-[40px] w-full rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_28%,transparent)] bg-[color-mix(in_srgb,#05070c_92%,black)] px-2 py-1.5 font-mono text-[clamp(11px,2.6vw,13px)] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_95%,white)] shadow-[inset_0_2px_8px_rgba(0,0,0,0.65)] outline-none ring-offset-2 ring-offset-[#03050c] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-mzk-plasma)_55%,white)] sm:min-h-[36px] pointer-coarse:min-h-11'

/**
 * Anchors hull command deck bottom-left, reserving the bottom-right quadrant for the SKL
 * viewer icon rail (Fit / Gear / …) so controls do not overlap.
 */
export const SIM_HULL_DECK_ANCHOR =
  'pointer-events-auto absolute z-[105] bottom-[max(0.15rem,env(safe-area-inset-bottom))] left-1.5 right-[5.75rem] max-h-[min(28dvh,360px)] sm:left-2 sm:bottom-2 sm:right-[6.25rem] md:right-[6.5rem] flex flex-col justify-end'

/** Top-right telemetry chips: stays inside viewport; clear of SKL dock on narrow widths. */
export const SIM_HUD_METRICS_ANCHOR =
  'absolute z-[105] top-1 right-1 flex max-w-[min(calc(100%-7.25rem),30rem)] flex-wrap justify-end gap-px px-0.5 pt-0.5 sm:top-2 sm:right-2'

/** Full-width top status strip — vitals + context + console (gaming HUD zone A). */
export const SIM_HUD_TOP_STATUS_STRIP =
  'pointer-events-auto absolute z-[105] left-2 right-2 top-1 flex max-w-[min(calc(100vw-5.5rem),20rem)] flex-col gap-1 rounded-[3px] border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_20%,transparent)] bg-[color-mix(in_srgb,#03050c_62%,transparent)] px-1.5 py-1 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-mzk-plasma-ice)_8%,transparent),0_4px_20px_rgba(0,0,0,0.45)] backdrop-blur-md sm:left-auto sm:right-2 sm:top-2 sm:max-w-[22rem]'

/** Vertical rail button for tactical console (zone C). */
export const SIM_CONSOLE_RAIL_BTN =
  'flex w-full flex-col items-center justify-center gap-0.5 rounded-[2px] border border-transparent px-1 py-2.5 font-mono text-[8px] font-bold uppercase leading-tight tracking-[0.06em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_72%,white)] transition-[background-color,border-color,color] hover:bg-white/5 pointer-coarse:min-h-[52px]'

export const SIM_CONSOLE_RAIL_BTN_ACTIVE =
  'border-[color-mix(in_srgb,var(--color-mzk-plasma)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_18%,#05070c)] text-[var(--color-mzk-reactor-white)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-mzk-silver)_12%,transparent)]'

/** SKL viewer controls dock — above hull deck z-index so the rail stays clickable. */
export const SIM_SKL_VIEWER_DOCK_Z = 'z-[110]'

/** Uniform simulator text-button row (directive, pads, PTT). */
export const SIM_ACTION_ROW = 'flex flex-wrap items-center gap-1'
export const SIM_CTL_H = 'h-8 min-h-[32px]'

/** Segmented switch-bank tabs (hull deck + SKL settings). */
export const SIM_TAB_STRIP =
  'flex w-full flex-nowrap gap-px overflow-x-auto rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_22%,transparent)] bg-black/75 p-px shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5)]'
export const SIM_TAB_BTN =
  'min-h-[32px] min-w-0 flex-1 px-2 py-1.5 font-mono text-[clamp(9px,2.2vw,11px)] font-semibold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_78%,white)] transition-[color,background-color,box-shadow] hover:bg-[color-mix(in_srgb,var(--color-mzk-plasma)_8%,black)] pointer-coarse:min-h-11 sm:min-h-9 first:rounded-l-[1px] last:rounded-r-[1px]'
export const SIM_TAB_BTN_ACTIVE =
  'bg-[color-mix(in_srgb,var(--color-mzk-plasma)_22%,#05070c)] text-[var(--color-mzk-reactor-white)] shadow-[inset_0_2px_0_color-mix(in_srgb,var(--color-mzk-silver)_14%,transparent),inset_0_-1px_0_rgba(0,0,0,0.5)]'

/** Alias for plan/readability — use with `SIM_TAB_BTN`. */
export const SIM_TAB_ACTIVE = SIM_TAB_BTN_ACTIVE

/** Matches hull viewer actuator easing — industrial snap. */
export const COCKPIT_ACTUATOR_EASE =
  '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)] duration-[var(--duration-mzk-short)]'

type CockpitPadTone = 'neutral' | 'plasma'

type CockpitPadProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  tone?: CockpitPadTone
}

/** Compact cockpit pad (viewer Controls / debug strip density). */
export function CockpitPad({
  className = '',
  children,
  type = 'button',
  tone = 'neutral',
  ...rest
}: CockpitPadProps) {
  const toneCls =
    tone === 'plasma'
      ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma)_48%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_14%,black)] text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_95%,var(--color-mzk-plasma-ice))] shadow-[0_0_22px_color-mix(in_srgb,var(--color-mzk-plasma)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-mzk-plasma)_26%,black)] hover:brightness-110'
      : 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_24%,transparent)] bg-[color-mix(in_srgb,black_84%,var(--color-mzk-plasma)_9%)] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_92%,white)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-mzk-silver)_12%,transparent)] hover:bg-[color-mix(in_srgb,black_74%,var(--color-mzk-plasma)_16%)] hover:border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_38%,transparent)]'

  return (
    <button
      type={type}
      className={`rounded-[3px] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] backdrop-blur-sm active:translate-y-px disabled:pointer-events-none disabled:opacity-40 sm:text-[11px] [clip-path:polygon(0_3px,3px_0,calc(100%-3px)_0,100%_3px,100%_calc(100%-3px),calc(100%-3px)_100%,3px_100%,0_calc(100%-3px))] ${toneCls} ${COCKPIT_ACTUATOR_EASE} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

type CockpitPrimaryActuatorProps = CockpitPadProps

/** Primary fire-control pad — directive execute / critical commit. */
export function CockpitPrimaryActuator({
  className = '',
  children,
  type = 'submit',
  ...rest
}: CockpitPrimaryActuatorProps) {
  return (
    <button
      type={type}
      className={`rounded-xl border border-[color-mix(in_srgb,var(--color-mzk-photon-red-hot)_58%,transparent)] bg-gradient-to-r from-[color-mix(in_srgb,var(--color-mzk-photon-red)_94%,black)] to-[color-mix(in_srgb,var(--color-mzk-photon-red-deep)_98%,black)] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-mzk-reactor-white)] shadow-[0_0_36px_color-mix(in_srgb,var(--color-mzk-photon-red)_38%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--color-mzk-silver)_26%,transparent)] hover:brightness-110 disabled:opacity-45 pointer-coarse:min-h-11 ${COCKPIT_ACTUATOR_EASE} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

type CockpitSeqActuatorProps = CockpitPadProps & { seqLabel?: string }

/** Minimal lab / arcade density — single-row toolbars on the hull deck. */
export function LabPad({
  className = '',
  children,
  type = 'button',
  ...rest
}: CockpitPadProps) {
  return (
    <button
      type={type}
      className={`rounded-md border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_18%,transparent)] bg-[color-mix(in_srgb,black_58%,transparent)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_90%,white)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-mzk-silver)_8%,transparent)] backdrop-blur-sm hover:bg-[color-mix(in_srgb,black_42%,var(--color-mzk-plasma)_12%)] disabled:pointer-events-none disabled:opacity-35 ${COCKPIT_ACTUATOR_EASE} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/** Icon-first hull toolbar control — min 44×44 touch target, safe for phones + ultrawide docks. */
export function ViewerIconButton({
  label,
  pressed,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; pressed?: boolean }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`touch-manipulation inline-flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center border-2 border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_42%,transparent)] bg-[color-mix(in_srgb,#080b12_94%,black)] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_96%,white)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-mzk-plasma-ice)_18%,transparent),0_4px_18px_rgba(0,0,0,0.7)] backdrop-blur-sm [clip-path:polygon(6px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_6px)] hover:border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_58%,transparent)] hover:bg-[color-mix(in_srgb,#0c1018_96%,black)] active:translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:h-[22px] [&_svg]:w-[22px] sm:h-12 sm:w-12 sm:min-h-[48px] sm:min-w-[48px] sm:[&_svg]:h-6 sm:[&_svg]:w-6 ${pressed ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma)_62%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_22%,#060810)] shadow-[inset_0_0_12px_color-mix(in_srgb,var(--color-mzk-plasma)_25%,transparent),0_0_20px_color-mix(in_srgb,var(--color-mzk-plasma)_22%,transparent)]' : ''} ${COCKPIT_ACTUATOR_EASE} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

/** Move-library sequence actuator — hull cockpit bus labeling. */
export function CockpitSeqActuator({
  seqLabel = 'SEQ',
  className = '',
  children,
  ...rest
}: CockpitSeqActuatorProps) {
  return (
    <button
      type="button"
      className={`group flex min-h-[3rem] w-full flex-col gap-1 rounded-xl border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_18%,transparent)] bg-[color-mix(in_srgb,black_82%,var(--color-mzk-plasma)_6%)] px-3 py-2.5 text-left shadow-[inset_0_0_28px_color-mix(in_srgb,var(--color-mzk-plasma)_6%,transparent)] backdrop-blur-sm hover:border-[color-mix(in_srgb,var(--color-mzk-gold)_42%,transparent)] hover:shadow-[0_0_28px_color-mix(in_srgb,var(--color-mzk-gold)_14%,transparent)] disabled:opacity-35 ${COCKPIT_ACTUATOR_EASE} ${className}`}
      {...rest}
    >
      <span className="font-mono text-[8px] uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--color-mzk-gold)_72%,transparent)] transition-colors group-hover:text-[color-mix(in_srgb,var(--color-mzk-gold)_96%,white)]">
        {seqLabel}
      </span>
      <span className="font-[family-name:var(--font-body)] text-[12px] font-semibold leading-snug text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_96%,silver)] group-hover:text-[var(--color-mzk-reactor-white)]">
        {children}
      </span>
    </button>
  )
}
