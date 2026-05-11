import type { MechaHudState } from '../../types'
import { CockpitPanel } from './CockpitPanel'

type SystemAlertsPanelProps = {
  hud: MechaHudState | null
}

export function SystemAlertsPanel({ hud }: SystemAlertsPanelProps) {
  const primary = hud?.tactical_alert ?? '—'
  const list = hud?.alerts_active?.length ? hud.alerts_active : []

  return (
    <CockpitPanel
      variant="hull"
      title="Tactical warfare band"
      subtitle="Photon threat lattice · hull-linked advisories"
      badge="ALRT"
      className="min-h-0"
    >
      <div
        className="rounded-xl border border-[color-mix(in_srgb,var(--color-mzk-photon-red)_48%,transparent)] px-3 py-3 shadow-[inset_0_0_40px_color-mix(in_srgb,var(--color-mzk-photon-red)_10%,transparent)]"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--color-mzk-photon-red-deep) 16%, transparent), transparent 52%)',
        }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.38em] text-[color-mix(in_srgb,var(--color-mzk-photon-red-hot)_95%,white)]">
          Tactical pulse
        </p>
        <p className="mt-1 font-mono text-sm font-semibold uppercase tracking-wide text-[var(--color-mzk-reactor-white)]">
          {primary}
        </p>
      </div>

      <div className="mt-4">
        <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_80%,transparent)]">
          Fault stack
        </p>
        <ul className="max-h-44 space-y-2 overflow-y-auto pr-1 font-mono text-[11px] leading-snug text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_90%,silver)]">
          {list.length ? (
            list.map((a, i) => (
              <li
                key={`${i}-${a.slice(0, 24)}`}
                className="border-l-2 border-[color-mix(in_srgb,var(--color-mzk-photon-red)_62%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black)_65%,transparent)] py-2 pl-3 shadow-[inset_0_0_24px_color-mix(in_srgb,var(--color-mzk-photon-red)_8%,transparent)]"
              >
                {a}
              </li>
            ))
          ) : (
            <li className="rounded-xl border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_18%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black-plate)_70%,transparent)] px-3 py-3 text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_78%,transparent)]">
              Advisory stack empty · simulation envelope nominal.
            </li>
          )}
        </ul>
      </div>
    </CockpitPanel>
  )
}
