import type { MechaHudState } from '../../types'
import { CockpitPad } from './cockpitControls'
import { CockpitPanel } from './CockpitPanel'
import { formatHudEnum } from './cockpitUtils'

type DiagnosticsPanelProps = {
  hud: MechaHudState | null
  onRunDiagnostics: () => void
  disabled: boolean
}

export function DiagnosticsPanel({ hud, onRunDiagnostics, disabled }: DiagnosticsPanelProps) {
  const d = hud
  const nova = d?.nova_readiness_pct ?? 0
  const novaAccent =
    nova > 72 ? 'text-[color-mix(in_srgb,var(--color-mzk-danger-purple-hot)_95%,white)]'
    : nova > 55 ? 'text-[color-mix(in_srgb,var(--color-mzk-warning-flare)_96%,white)]'
    : 'text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_92%,var(--color-mzk-silver-dim))]'

  const overdrivePct = d?.overdrive_risk_pct ?? 0
  const overAccent =
    overdrivePct > 55 ? 'text-[color-mix(in_srgb,var(--color-mzk-photon-red-hot)_95%,white)]'
    : 'text-[color-mix(in_srgb,var(--color-mzk-silver-bright)_90%,silver)]'

  return (
    <CockpitPanel
      variant="hull"
      title="Diagnostics manifold"
      subtitle="Simulation kernel · hull normalization pass"
      badge="DIAG"
      headerAction={
        <CockpitPad
          tone="plasma"
          disabled={disabled}
          onClick={onRunDiagnostics}
          className="px-3 py-2 text-[10px] font-semibold tracking-[0.12em]"
        >
          Run full diagnostics
        </CockpitPad>
      }
    >
      <div className="grid gap-3 font-mono text-[11px] sm:grid-cols-2">
        <Cell k="Twin clock(s)" v={d?.simulation_clock_s != null ? d.simulation_clock_s.toFixed(2) : '—'} />
        <Cell k="Event sequence" v={d?.twin_event_seq != null ? String(d.twin_event_seq) : '—'} />
        <Cell k="Structural stress" v={`${(d?.structural_stress_pct ?? 0).toFixed(1)}%`} />
        <Cell k="Aux routing" v={`${(d?.aux_routing_pct ?? 0).toFixed(1)}%`} />
        <Cell k="Synchro bandwidth" v={`${(d?.synchro_bandwidth_pct ?? 0).toFixed(1)}%`} />
        <Cell
          k="Movement ready"
          v={d?.movement_ready ? 'TRUE' : 'FALSE'}
          accent={
            d?.movement_ready ?
              'text-[color-mix(in_srgb,var(--color-mzk-gold-core)_94%,white)]'
            : 'text-[color-mix(in_srgb,var(--color-mzk-photon-red)_92%,black)]'
          }
        />
        <Cell k="Nova readiness" v={`${nova.toFixed(1)}%`} accent={novaAccent} />
        <Cell k="Overdrive risk" v={`${overdrivePct.toFixed(1)}%`} accent={overAccent} />
        <Cell k="Pilot sync tier" v={`${(d?.pilot_sync_pct ?? 0).toFixed(1)}%`} />
        <Cell k="Pilot stress" v={`${(d?.pilot_stress_pct ?? 0).toFixed(1)}%`} />
        <Cell k="Recognition" v={formatHudEnum(d?.pilot_recognition_status)} />
        <Cell k="Bio confidence" v={`${(d?.pilot_biometric_confidence_pct ?? 0).toFixed(1)}%`} />
      </div>
    </CockpitPanel>
  )
}

function Cell({
  k,
  v,
  accent = 'text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_92%,var(--color-mzk-plasma-ice))]',
}: {
  k: string
  v: string
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black)_62%,transparent)] px-2.5 py-2 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-mzk-silver-bright)_8%,transparent)]">
      <p className="text-[9px] uppercase tracking-[0.22em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_78%,transparent)]">
        {k}
      </p>
      <p className={`mt-1 truncate text-xs ${accent}`}>{v}</p>
    </div>
  )
}
