import type { MoveVisualKind } from '../presentation/types'

/** Full-frame move duvet — static treatment (no looping motion / cinematic pulses). */
export function MoveDemonstrationOverlay(props: {
  active: boolean
  moveTitle: string
  /** Backend move_id slug when known (fine-tunes VFX e.g. Turbo Smasher vs generic melee). */
  moveSlug?: string | null
  visualHint: MoveVisualKind
}) {
  if (!props.active) return null

  const slug = (props.moveSlug ?? '').toLowerCase()
  const isTurboSmasher = slug.includes('turbo-smasher') || props.moveTitle.toLowerCase().includes('turbo')
  const isFireBlaster = slug.includes('fire-blaster') || props.moveTitle.toLowerCase().includes('fire blaster')

  const hueOpacity =
    props.visualHint === 'nova' ? 0.34 : props.visualHint === 'beam' || props.visualHint === 'thermal' ? 0.28 : 0.22

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[45] overflow-hidden bg-[color-mix(in_srgb,var(--color-mzk-black)_86%,black)] backdrop-blur-[1.5px]"
      aria-live="polite"
    >
      <div
        className={`absolute inset-0 mix-blend-screen ${hueClass(props.visualHint, isTurboSmasher, isFireBlaster)}`}
        style={{ opacity: hueOpacity }}
      />

      {props.visualHint === 'nova' ? (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_65%_at_50%_40%,color-mix(in_srgb,var(--color-mzk-danger-purple-hot)_52%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-photon-red-hot)_35%,transparent)_45%,transparent_78%)] mix-blend-plus-lighter opacity-[0.48]" />
      ) : null}

      {(isTurboSmasher || props.visualHint === 'melee') && !isFireBlaster ? (
        <div
          className="absolute inset-0 opacity-[0.28] mix-blend-plus-lighter"
          style={{
            background:
              'repeating-linear-gradient(105deg, transparent, transparent 42px, color-mix(in srgb, var(--color-mzk-photon-red-hot) 42%, transparent) 44px, transparent 48px)',
          }}
        />
      ) : null}

      <div
        aria-hidden
        className="absolute inset-[-18%]"
        style={{
          background: conicForHint(props.visualHint, isFireBlaster),
          opacity: 0.45,
        }}
      />

      <div className="absolute inset-x-0 top-0 z-[2] h-[10%] max-h-28 bg-[color-mix(in_srgb,var(--color-mzk-black)_94%,transparent)]" />
      <div className="absolute inset-x-0 bottom-0 z-[2] h-[10%] max-h-28 bg-[color-mix(in_srgb,var(--color-mzk-black)_94%,transparent)]" />

      <div className="absolute left-12 top-[11%] z-[3]">
        <span className="font-mono text-[10px] uppercase tracking-[0.55em] text-[color-mix(in_srgb,var(--color-mzk-silver-bright)_88%,var(--color-mzk-plasma))]">
          KAISER MOVE GRAPH
        </span>
        <p className="font-[family-name:var(--font-display)] mt-2 text-xl font-bold uppercase tracking-[0.2em] text-[var(--color-mzk-reactor-white)] drop-shadow-[0_0_18px_color-mix(in_srgb,var(--color-mzk-plasma-ice)_55%,transparent)] md:text-2xl">
          {props.moveTitle}
        </p>
        <p className="font-mono mt-1 text-[11px] uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_92%,var(--color-mzk-photon-red))]">
          {props.visualHint === 'nova'
            ? 'PHASE · CATASTROPHIC PHOTON BLEED — EMERGENCY LENS'
            : 'PHASE · BATCH EXECUTION · CINEMATIC WAR ROOM'}
        </p>
      </div>

      <div
        aria-hidden
        className="absolute inset-0 z-[4]"
        style={{
          boxShadow: vignette(props.visualHint),
        }}
      />

      {props.visualHint === 'blade' || props.moveTitle.toLowerCase().includes('blade') ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[3] mix-blend-screen"
          style={{
            background:
              'linear-gradient(112deg, transparent 40%, color-mix(in srgb, var(--color-mzk-gold) 28%, transparent) 50%, transparent 60%)',
            opacity: 0.55,
          }}
        />
      ) : null}

      {props.visualHint === 'thermal' || isFireBlaster ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[3]"
          style={{
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 35%, transparent 78%)',
            backgroundImage:
              'linear-gradient(180deg, color-mix(in srgb,var(--color-mzk-warning-flare)_15%,transparent), transparent)',
            opacity: 0.42,
          }}
        />
      ) : null}
    </div>
  )
}

function conicForHint(v: MoveVisualKind, fire: boolean): string {
  const red = 'color-mix(in srgb, var(--color-mzk-photon-red-hot) 40%, transparent)'
  const violet = 'color-mix(in srgb, var(--color-mzk-plasma-violet) 42%, transparent)'
  const silver = 'color-mix(in srgb, var(--color-mzk-silver-bright) 30%, transparent)'
  if (v === 'nova') {
    return `conic-gradient(from 210deg, transparent 32%, ${violet} 44%, transparent 54%, ${red} 62%, transparent 74%)`
  }
  if (fire || v === 'thermal') {
    return `conic-gradient(from 200deg, transparent 38%, ${red} 51%, transparent 66%)`
  }
  return `conic-gradient(from 210deg, transparent 34%, ${silver} 40%, transparent 53%, ${red} 58%, transparent 71%)`
}

function vignette(v: MoveVisualKind): string {
  if (v === 'nova') {
    return 'inset 0 0 200px color-mix(in srgb,var(--color-mzk-danger-purple)_52%,transparent), inset 0 0 96px color-mix(in srgb,var(--color-mzk-photon-red-hot)_48%,transparent), inset 0 0 64px color-mix(in srgb,var(--color-mzk-plasma-ice)_28%,transparent)'
  }
  return 'inset 0 0 140px color-mix(in srgb,var(--color-mzk-plasma)_22%,transparent), inset 0 0 92px color-mix(in srgb,var(--color-mzk-photon-red-deep)_38%,transparent)'
}

function hueClass(v: MoveVisualKind, turboMelee: boolean, fire: boolean): string {
  if (fire || v === 'thermal') {
    return 'bg-[radial-gradient(ellipse_82%_58%_at_50%_28%,color-mix(in_srgb,var(--color-mzk-photon-red-hot)_55%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-warning-orange)_38%,transparent)_42%,transparent_72%)]'
  }
  if (turboMelee || v === 'melee') {
    return 'bg-[radial-gradient(ellipse_78%_55%_at_50%_22%,color-mix(in_srgb,var(--color-mzk-photon-red-deep)_62%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-danger-purple)_35%,transparent)_55%,transparent_76%)]'
  }
  switch (v) {
    case 'beam':
    case 'nova':
      return 'bg-[radial-gradient(ellipse_92%_58%_at_50%_24%,color-mix(in_srgb,var(--color-mzk-plasma-ice)_55%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-plasma-violet)_52%,transparent)_48%,transparent_74%)]'
    case 'blade':
      return 'bg-[radial-gradient(ellipse_72%_52%_at_50%_20%,color-mix(in_srgb,var(--color-mzk-gold-core)_52%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-silver-bright)_38%,transparent)_55%,transparent_70%)]'
    case 'field':
      return 'bg-[radial-gradient(ellipse_86%_60%_at_50%_18%,color-mix(in_srgb,var(--color-mzk-plasma)_42%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-plasma-ice)_22%,transparent)_70%,transparent_78%)]'
    case 'thruster':
      return 'bg-[radial-gradient(ellipse_82%_55%_at_50%_16%,color-mix(in_srgb,var(--color-mzk-plasma-ice)_50%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-plasma)_35%,transparent)_60%,transparent_74%)]'
    default:
      return 'bg-[radial-gradient(ellipse_82%_58%_at_50%_30%,color-mix(in_srgb,var(--color-mzk-plasma-ice)_38%,transparent)_0%,transparent_72%)]'
  }
}
