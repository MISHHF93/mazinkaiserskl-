import type { PersonalityMode } from '../../types'
import { PERSONALITY_MODES } from '../../types'
import { CockpitPanel } from './CockpitPanel'

type ModeSwitcherPanelProps = {
  mode: PersonalityMode
  strictWake: boolean
  onModeChange: (m: PersonalityMode) => void
  onStrictWakeChange: (v: boolean) => void
}

export function ModeSwitcherPanel({
  mode,
  strictWake,
  onModeChange,
  onStrictWakeChange,
}: ModeSwitcherPanelProps) {
  return (
    <CockpitPanel
      variant="hull"
      title="Personality lattice"
      subtitle="Kaiser cognition · hull-linked profile shell"
      badge="MODE"
    >
      <label
        className="text-[10px] uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_82%,transparent)]"
        htmlFor="cockpit-personality-select"
      >
        Active mode
      </label>
      <select
        id="cockpit-personality-select"
        className="mt-2 w-full cursor-pointer rounded-xl border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_20%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black-raised)_94%,transparent)] px-3 py-2 font-[family-name:var(--font-body)] text-sm text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_98%,silver)] shadow-[inset_0_0_28px_color-mix(in_srgb,var(--color-mzk-plasma)_5%,transparent)] outline-none ring-[color-mix(in_srgb,var(--color-mzk-plasma)_38%,transparent)] transition-shadow duration-[var(--duration-mzk-panel)] focus:ring-2"
        value={mode}
        onChange={(e) => onModeChange(e.target.value as PersonalityMode)}
      >
        {PERSONALITY_MODES.map((m) => (
          <option key={m} value={m}>
            {m.replace(/_/g, ' ')}
          </option>
        ))}
      </select>

      <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_16%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black-plate)_55%,transparent)] px-3 py-2.5 shadow-[inset_0_0_32px_color-mix(in_srgb,var(--color-mzk-plasma)_8%,transparent)]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--color-mzk-silver-bright)_92%,transparent)]">
            Wake phrase gate
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_88%,transparent)]">
            Local filter before cockpit transmit. Backend still strips Kaiser prefixes server-side.
          </p>
        </div>
        <label htmlFor="strict-wake" className="sr-only">
          Strict wake phrases
        </label>
        <input
          id="strict-wake"
          type="checkbox"
          checked={strictWake}
          onChange={(e) => onStrictWakeChange(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[var(--color-mzk-gold-core)]"
        />
      </div>
      <p className="mt-2 text-[9px] leading-relaxed text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_72%,transparent)] sm:text-[10px]">
        Always-on keywords live in{' '}
        <code className="rounded-[2px] bg-[color-mix(in_srgb,var(--color-mzk-black)_88%,transparent)] px-1 text-[color-mix(in_srgb,var(--color-mzk-plasma-violet)_75%,silver)]">
          wakeArchitecture.ts
        </code>{' '}
        for future WASM wake.
      </p>
    </CockpitPanel>
  )
}
