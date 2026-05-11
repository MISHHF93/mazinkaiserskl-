import { KAISER_MOVES } from '../../types'
import { CockpitPad, CockpitSeqActuator } from './cockpitControls'
import { CockpitPanel } from './CockpitPanel'

type MoveLibraryPanelProps = {
  tacticalSnippet: string
  loadingTactical: boolean
  onLoadTactical: () => void
  onDemoMove: (move: string) => void
  sessionReady: boolean
}

export function MoveLibraryPanel({
  tacticalSnippet,
  loadingTactical,
  onLoadTactical,
  onDemoMove,
  sessionReady,
}: MoveLibraryPanelProps) {
  return (
    <CockpitPanel
      variant="hull"
      title="Armament bus · demo"
      subtitle="Hull-linked sequence actuators · photon simulation envelope"
      badge="MOV"
      headerAction={
        <CockpitPad
          tone="plasma"
          disabled={loadingTactical}
          onClick={onLoadTactical}
          className="px-3 py-2 text-[10px] font-semibold tracking-[0.14em]"
        >
          {loadingTactical ? 'Fetch…' : 'Tactical env'}
        </CockpitPad>
      }
    >
      <div className="-m-4 max-h-[min(520px,calc(100vh-340px))] overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {KAISER_MOVES.map((m) => (
            <CockpitSeqActuator key={m} disabled={!sessionReady} onClick={() => onDemoMove(m)} seqLabel="BUS">
              {m}
            </CockpitSeqActuator>
          ))}
        </div>
      </div>
      {tacticalSnippet ?
        <div className="mt-4 border-t border-[color-mix(in_srgb,var(--color-mzk-silver)_12%,transparent)] pt-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_78%,transparent)]">
            Tactical envelope
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_88%,silver)]">{tacticalSnippet}</p>
        </div>
      : null}
    </CockpitPanel>
  )
}
