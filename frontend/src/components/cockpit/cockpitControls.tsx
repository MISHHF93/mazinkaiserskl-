import type { ButtonHTMLAttributes, ReactNode } from 'react'

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
      className={`rounded-lg px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] backdrop-blur-sm disabled:pointer-events-none disabled:opacity-40 sm:text-[11px] ${toneCls} ${COCKPIT_ACTUATOR_EASE} ${className}`}
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
      className={`rounded-xl border border-[color-mix(in_srgb,var(--color-mzk-photon-red-hot)_58%,transparent)] bg-gradient-to-r from-[color-mix(in_srgb,var(--color-mzk-photon-red)_94%,black)] to-[color-mix(in_srgb,var(--color-mzk-photon-red-deep)_98%,black)] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-mzk-reactor-white)] shadow-[0_0_36px_color-mix(in_srgb,var(--color-mzk-photon-red)_38%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--color-mzk-silver)_26%,transparent)] hover:brightness-110 disabled:opacity-45 ${COCKPIT_ACTUATOR_EASE} ${className}`}
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
      className={`touch-manipulation inline-flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-xl border-2 border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_38%,transparent)] bg-[color-mix(in_srgb,#0f131c_96%,black)] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_96%,white)] shadow-[0_6px_28px_rgba(0,0,0,0.65)] ring-1 ring-black/60 backdrop-blur-md hover:bg-[color-mix(in_srgb,#151a24_98%,black)] hover:border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_52%,transparent)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:h-[22px] [&_svg]:w-[22px] sm:h-12 sm:w-12 sm:min-h-[48px] sm:min-w-[48px] sm:[&_svg]:h-6 sm:[&_svg]:w-6 ${pressed ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma)_58%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_24%,#0a0c10)] ring-2 ring-[color-mix(in_srgb,var(--color-mzk-plasma)_42%,transparent)]' : ''} ${COCKPIT_ACTUATOR_EASE} ${className}`}
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
