import type { MechaHudState } from '../../types'
import { CockpitPanel } from './CockpitPanel'
import { formatHudEnum } from './cockpitUtils'
import { HudGauge } from './HudGauge'

type TelemetryHudPanelProps = {
  hud: MechaHudState | null
}

export function TelemetryHudPanel({ hud }: TelemetryHudPanelProps) {
  const d = hud
  return (
    <CockpitPanel
      variant="hull"
      title="Photon lattice telemetry"
      subtitle="Twin projection · armour bus · hull synchro corridors (SIMULATION)"
      badge="HUD"
      className="min-h-0"
    >
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-3">
        <HudGauge
          label="Photon power core"
          value={d?.photon_power_pct ?? 0}
          accent="from-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_92%,transparent)] to-[color-mix(in_srgb,var(--color-mzk-plasma-violet)_82%,transparent)]"
        />
        <HudGauge
          label="Armour plating"
          value={d?.armor_integrity_pct ?? 0}
          accent="from-[color-mix(in_srgb,var(--color-mzk-silver-bright)_88%,transparent)] to-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]"
        />
        <HudGauge
          label="Thermal load"
          value={d?.heat_level_pct ?? 0}
          accent="from-[color-mix(in_srgb,var(--color-mzk-warning-flare)_90%,transparent)] to-[color-mix(in_srgb,var(--color-mzk-photon-red)_78%,transparent)]"
        />
        <HudGauge
          label="Synchro rate"
          value={d?.sync_rate_pct ?? 0}
          accent="from-[color-mix(in_srgb,var(--color-mzk-gold-core)_75%,transparent)] to-[color-mix(in_srgb,var(--color-mzk-warning-orange)_72%,transparent)]"
        />
        <HudGauge
          label="Reactor output"
          value={d?.reactor_output_pct ?? 0}
          accent="from-[color-mix(in_srgb,var(--color-mzk-photon-red-hot)_88%,transparent)] to-[color-mix(in_srgb,var(--color-mzk-warning-orange)_70%,transparent)]"
        />
        <HudGauge
          label="Reserve banks"
          value={d?.energy_reserve_pct ?? 0}
          accent="from-[color-mix(in_srgb,var(--color-mzk-plasma-violet)_92%,transparent)] to-[color-mix(in_srgb,var(--color-mzk-danger-purple)_76%,transparent)]"
        />
      </div>

      <dl className="font-mono mt-3 grid gap-2 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_14%,transparent)] pt-3 text-[10px] sm:grid-cols-2 sm:text-[11px]">
        <Row k="Cognitive façade" v={formatHudEnum(d?.mode)} accent="text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_95%,white)]" />
        <Row
          k="Operational posture"
          v={formatHudEnum(d?.operational_state)}
          accent="text-[color-mix(in_srgb,var(--color-mzk-plasma-violet)_92%,white)]"
        />
        <Row
          k="Active move imprint"
          v={d?.last_demo_move ? formatHudEnum(d.last_demo_move) : 'NONE'}
          accent="text-[color-mix(in_srgb,var(--color-mzk-photon-red-hot)_92%,white)]"
        />
        <Row k="Scrander wing" v={formatHudEnum(d?.scrander_status)} accent="text-[color-mix(in_srgb,var(--color-mzk-silver-bright)_90%,white)]" />
        <Row k="Pilder dock" v={formatHudEnum(d?.pilder_docking_status)} accent="text-[color-mix(in_srgb,var(--color-mzk-gold-core)_90%,black)]" />
        <Row k="Locomotion bus" v={formatHudEnum(d?.movement_state)} />
      </dl>
    </CockpitPanel>
  )
}

function Row({
  k,
  v,
  accent = 'text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_92%,transparent)]',
}: {
  k: string
  v: string
  accent?: string
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black)_78%,transparent)] px-2.5 py-1.5 font-mono shadow-[inset_0_0_20px_color-mix(in_srgb,var(--color-mzk-plasma)_4%,transparent)]">
      <dt className="text-[9px] uppercase tracking-[0.22em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_88%,transparent)]">
        {k}
      </dt>
      <dd className={`truncate text-xs font-semibold ${accent}`}>{v}</dd>
    </div>
  )
}
