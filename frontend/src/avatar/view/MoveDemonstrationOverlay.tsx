import type { MoveVisualKind } from '../presentation/types'

/**
 * Move phase FX — letterbox + edge vignette so the SKL hull stays visible in the center (~65%+ clear).
 */
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
    props.visualHint === 'nova' ? 0.26 : props.visualHint === 'beam' || props.visualHint === 'thermal' ? 0.2 : 0.16

  return (
    <div className="pointer-events-none fixed inset-0 z-[45] overflow-hidden" aria-live="polite">
      {/* Top/bottom letterbox — does not cover hull center */}
      <div className="absolute inset-x-0 top-0 z-[3] h-[12%] max-h-[132px] bg-gradient-to-b from-[color-mix(in_srgb,black_94%,var(--color-mzk-blood-energy)_6%)] via-black/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-[3] h-[12%] max-h-[132px] bg-gradient-to-t from-[color-mix(in_srgb,black_92%,var(--color-mzk-blood-energy)_8%)] via-black/45 to-transparent" />

      {/* Edge-only wash — radial mask keeps center transparent for 3D viewport */}
      <div
        className={`absolute inset-0 z-[1] mix-blend-screen ${hueClass(props.visualHint, isTurboSmasher, isFireBlaster)}`}
        style={{
          opacity: hueOpacity,
          maskImage: 'radial-gradient(ellipse 72% 78% at 50% 50%, transparent 38%, black 96%)',
          WebkitMaskImage: 'radial-gradient(ellipse 72% 78% at 50% 50%, transparent 38%, black 96%)',
        }}
      />

      {props.visualHint === 'nova' ? (
        <div
          className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_80%_65%_at_50%_40%,color-mix(in_srgb,var(--color-mzk-danger-purple-hot)_42%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-photon-red-hot)_28%,transparent)_45%,transparent_78%)] mix-blend-plus-lighter opacity-[0.38]"
          style={{
            maskImage: 'radial-gradient(ellipse 76% 82% at 50% 50%, transparent 36%, black 95%)',
            WebkitMaskImage: 'radial-gradient(ellipse 76% 82% at 50% 50%, transparent 36%, black 95%)',
          }}
        />
      ) : null}

      {(isTurboSmasher || props.visualHint === 'melee') && !isFireBlaster ? (
        <div
          className="absolute inset-0 z-[1] opacity-[0.22] mix-blend-plus-lighter"
          style={{
            background:
              'repeating-linear-gradient(105deg, transparent, transparent 42px, color-mix(in srgb, var(--color-mzk-photon-red-hot) 38%, transparent) 44px, transparent 48px)',
            maskImage: 'radial-gradient(ellipse 74% 80% at 50% 50%, transparent 35%, black 94%)',
            WebkitMaskImage: 'radial-gradient(ellipse 74% 80% at 50% 50%, transparent 35%, black 94%)',
          }}
        />
      ) : null}

      <div
        aria-hidden
        className="absolute inset-[-18%] z-[1]"
        style={{
          background: conicForHint(props.visualHint, isFireBlaster),
          opacity: 0.32,
          maskImage: 'radial-gradient(ellipse 78% 84% at 50% 50%, transparent 40%, black 96%)',
          WebkitMaskImage: 'radial-gradient(ellipse 78% 84% at 50% 50%, transparent 40%, black 96%)',
        }}
      />

      <div
        aria-hidden
        className="absolute inset-0 z-[4]"
        style={{
          boxShadow: vignette(props.visualHint),
          pointerEvents: 'none',
        }}
      />

      <div className="absolute left-3 top-[10%] z-[5] max-w-[min(88vw,28rem)] sm:left-10 sm:top-[12%]">
        <span className="font-mono text-[9px] uppercase tracking-[0.42em] text-[color-mix(in_srgb,var(--color-mzk-skull-bone)_88%,var(--color-mzk-blood-energy))] sm:text-[10px] sm:tracking-[0.5em]">
          KAISER SKL · MOVE GRAPH
        </span>
        <p className="font-[family-name:var(--font-display)] mt-1.5 text-lg font-bold uppercase tracking-[0.14em] text-[var(--color-mzk-skull-bone)] drop-shadow-[0_0_16px_color-mix(in_srgb,var(--color-mzk-blood-energy)_45%,transparent)] sm:mt-2 sm:text-xl md:text-2xl">
          {props.moveTitle}
        </p>
        <p className="font-mono mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_92%,var(--color-mzk-inferno-yellow))] sm:text-[11px] sm:tracking-[0.16em]">
          {props.visualHint === 'nova'
            ? 'PHASE · PHOTON BLEED — NOVA ENVELOPE'
            : 'PHASE · BATCH EXECUTION · HULL FORWARD'}
        </p>
      </div>

      {props.visualHint === 'blade' || props.moveTitle.toLowerCase().includes('blade') ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[3] mix-blend-screen"
          style={{
            background:
              'linear-gradient(112deg, transparent 40%, color-mix(in srgb, var(--color-mzk-gold) 26%, transparent) 50%, transparent 60%)',
            opacity: 0.42,
            maskImage: 'radial-gradient(ellipse 80% 85% at 50% 50%, transparent 42%, black 96%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 85% at 50% 50%, transparent 42%, black 96%)',
          }}
        />
      ) : null}

      {props.visualHint === 'thermal' || isFireBlaster ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[3]"
          style={{
            maskImage: 'radial-gradient(ellipse 78% 84% at 50% 50%, transparent 40%, black 96%)',
            WebkitMaskImage: 'radial-gradient(ellipse 78% 84% at 50% 50%, transparent 40%, black 96%)',
            backgroundImage:
              'linear-gradient(180deg, color-mix(in srgb,var(--color-mzk-warning-flare)_12%,transparent), transparent)',
            opacity: 0.36,
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
    return 'inset 0 0 200px color-mix(in srgb,var(--color-mzk-danger-purple)_42%,transparent), inset 0 0 96px color-mix(in srgb,var(--color-mzk-photon-red-hot)_42%,transparent), inset 0 0 64px color-mix(in srgb,var(--color-mzk-plasma-ice)_22%,transparent)'
  }
  return 'inset 0 0 120px color-mix(in srgb,var(--color-mzk-plasma)_18%,transparent), inset 0 0 88px color-mix(in srgb,var(--color-mzk-blood-energy)_35%,transparent)'
}

function hueClass(v: MoveVisualKind, turboMelee: boolean, fire: boolean): string {
  if (fire || v === 'thermal') {
    return 'bg-[radial-gradient(ellipse_82%_58%_at_50%_28%,color-mix(in_srgb,var(--color-mzk-photon-red-hot)_48%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-warning-orange)_32%,transparent)_42%,transparent_72%)]'
  }
  if (turboMelee || v === 'melee') {
    return 'bg-[radial-gradient(ellipse_78%_55%_at_50%_22%,color-mix(in_srgb,var(--color-mzk-photon-red-deep)_55%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-danger-purple)_30%,transparent)_55%,transparent_76%)]'
  }
  switch (v) {
    case 'beam':
    case 'nova':
      return 'bg-[radial-gradient(ellipse_92%_58%_at_50%_24%,color-mix(in_srgb,var(--color-mzk-plasma-ice)_48%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-plasma-violet)_48%,transparent)_48%,transparent_74%)]'
    case 'blade':
      return 'bg-[radial-gradient(ellipse_72%_52%_at_50%_20%,color-mix(in_srgb,var(--color-mzk-gold-core)_48%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-silver-bright)_35%,transparent)_55%,transparent_70%)]'
    case 'field':
      return 'bg-[radial-gradient(ellipse_86%_60%_at_50%_18%,color-mix(in_srgb,var(--color-mzk-plasma)_38%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-plasma-ice)_20%,transparent)_70%,transparent_78%)]'
    case 'thruster':
      return 'bg-[radial-gradient(ellipse_82%_55%_at_50%_16%,color-mix(in_srgb,var(--color-mzk-plasma-ice)_45%,transparent)_0%,color-mix(in_srgb,var(--color-mzk-plasma)_32%,transparent)_60%,transparent_74%)]'
    default:
      return 'bg-[radial-gradient(ellipse_82%_58%_at_50%_30%,color-mix(in_srgb,var(--color-mzk-plasma-ice)_35%,transparent)_0%,transparent_72%)]'
  }
}
