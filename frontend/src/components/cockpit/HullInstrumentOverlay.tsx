import type { FormEvent } from 'react'
import { useId, useState } from 'react'
import type { MechaHudState, PersonalityMode } from '../../types'
import { KAISER_MOVES, PERSONALITY_MODES } from '../../types'
import type { VoiceConsoleSlice, VoicePushToTalkProps } from './CommandConsole'
import {
  CockpitPad,
  CockpitPrimaryActuator,
  LabPad,
  SIM_FLOAT_PANEL,
  SIM_HUD_METRICS_ANCHOR,
  SIM_HULL_DECK_ANCHOR,
  SIM_ACTION_ROW,
  SIM_CTL_H,
  SIM_TAB_STRIP,
  SIM_TAB_BTN,
  SIM_TAB_BTN_ACTIVE,
} from './cockpitControls'
import { formatHudEnum } from './cockpitUtils'

/** Props for instrumentation composited on the SKL hull surface (SIMULATION). */
export type HullInstrumentOverlayProps = {
  hud: MechaHudState | null
  /** Avatar semantic label — shown on lab deck when hull chrome hides the hull footer ribbon. */
  twinStateLabel: string
  kaiserLine: string
  subtitleStreaming: boolean
  personalityMode: PersonalityMode
  strictWake: boolean
  onPersonalityModeChange: (m: PersonalityMode) => void
  onStrictWakeChange: (v: boolean) => void
  onRunDiagnostics: () => void
  tacticalSnippet: string
  tacticalLoading: boolean
  onLoadTactical: () => void
  onDemoMove: (move: string) => void
  sessionId: string | null
  commandInput: string
  setCommandInput: (v: string) => void
  transcript: string
  assistantStream: string
  voice: VoiceConsoleSlice
  pushToTalkProps: VoicePushToTalkProps
  onCommandSubmit: (e: FormEvent) => void
  onVoiceNormalize: () => void
  avatarListening: boolean
}

function MiniChip({ k, v, title }: { k: string; v: string; title?: string }) {
  return (
    <span
      title={title}
      className="rounded border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_35%,transparent)] bg-black/78 px-[clamp(4px,1vw,8px)] py-[clamp(2px,0.5vw,5px)] font-mono text-[clamp(8px,1.8vw,10px)] uppercase tracking-[0.06em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_92%,white)] shadow-[0_2px_12px_rgba(0,0,0,0.65)] backdrop-blur-md"
    >
      <span className="text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">{k}</span>{' '}
      <span className="text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_92%,white)]">{v}</span>
    </span>
  )
}

function MicroBar({ label, pct, title }: { label: string; pct: number; title: string }) {
  const p = Math.min(100, Math.max(0, pct))
  return (
    <div className="min-w-[min(56px,22vw)] flex-1" title={title}>
      <div className="flex justify-between font-mono text-[clamp(8px,1.8vw,10px)] uppercase tracking-[0.05em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_92%,white)]">
        <span className="truncate">{label}</span>
        <span className="tabular-nums">{p.toFixed(0)}</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-sm bg-black/85 ring-1 ring-[color-mix(in_srgb,var(--color-mzk-plasma)_28%,black)]">
        <div
          className="h-full bg-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_55%,var(--color-mzk-plasma-violet)_35%)]"
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Laboratory / desktop-game hull deck — viewer-first: slim metrics, single consolidated control slab,
 * simple pads. Pointer-events mostly on the slab so the hull stays easy to orbit.
 */
type DeckTab = 'command' | 'combat' | 'twin'

const DECK_TABS: readonly { id: DeckTab; label: string }[] = [
  { id: 'command', label: 'Command' },
  { id: 'combat', label: 'Combat' },
  { id: 'twin', label: 'Pilot' },
] as const

export function HullInstrumentOverlay(props: HullInstrumentOverlayProps) {
  const d = props.hud
  const labEase = '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)] duration-[var(--duration-mzk-short)]'
  /** Viewer-first: start collapsed so the SKL viewport uses maximum area. */
  const [deckExpanded, setDeckExpanded] = useState(false)
  const [deckTab, setDeckTab] = useState<DeckTab>('command')
  const deckTabId = useId()

  const focusAdjacentDeckTab = (dir: -1 | 1) => {
    const order = DECK_TABS.map((t) => t.id)
    const i = order.indexOf(deckTab)
    const next = (i + dir + order.length) % order.length
    const nextId = order[next]!
    setDeckTab(nextId)
    queueMicrotask(() => document.getElementById(`${deckTabId}-tab-${nextId}`)?.focus())
  }

  const activateDeckTab = (id: DeckTab) => {
    setDeckTab(id)
    queueMicrotask(() => document.getElementById(`${deckTabId}-tab-${id}`)?.focus())
  }

  return (
    <div role="region" aria-label="Hull lab deck" className="pointer-events-none absolute inset-0 min-h-0">
      <div className={`${SIM_HUD_METRICS_ANCHOR} pointer-events-auto`}>
        <MiniChip k="Twin" title={props.twinStateLabel} v={props.twinStateLabel.length > 18 ? `${props.twinStateLabel.slice(0, 18)}…` : props.twinStateLabel} />
        <MiniChip k="Alert" v={(d?.tactical_alert ?? '—').slice(0, 20)} />
        {deckExpanded ?
          <>
            <MicroBar label="PH" pct={d?.photon_power_pct ?? 0} title="Photon power (%)" />
            <MicroBar label="SY" pct={d?.sync_rate_pct ?? 0} title="Sync rate (%)" />
            <MicroBar label="TH" pct={d?.heat_level_pct ?? 0} title="Thermal load (%)" />
            <MicroBar label="AR" pct={d?.armor_integrity_pct ?? 0} title="Armor integrity (%)" />
          </>
        : (
          <button
            type="button"
            title="Show power bars in HUD"
            className="rounded border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_30%,transparent)] bg-black/75 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_78%,white)] shadow-sm backdrop-blur-sm hover:bg-black/90 sm:text-[9px]"
            onClick={() => setDeckExpanded(true)}
          >
            <span className="sm:hidden">Bars</span>
            <span className="hidden sm:inline">Meters</span>
          </button>
        )}
      </div>

      <div className={SIM_HULL_DECK_ANCHOR}>
        <div
          title={deckExpanded ? undefined : 'Kaiser command — More opens Command, Combat moves, and Pilot meters'}
          className={
            deckExpanded ?
              `${SIM_FLOAT_PANEL} w-full min-h-0 max-h-[min(32dvh,300px)] overflow-y-auto overscroll-contain px-[clamp(0.3rem,1.4vw,0.65rem)] pb-1 pt-1 sm:max-h-[min(34dvh,340px)]`
            : `${SIM_FLOAT_PANEL} w-full px-2 pb-1.5 pt-1`
          }
        >
        {!deckExpanded ?
          <>
            <p
              className="line-clamp-1 text-center font-mono text-[clamp(9px,2.2vw,11px)] font-medium leading-tight text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_94%,white)]"
              style={{ textShadow: '0 0 12px color-mix(in srgb, var(--color-mzk-plasma-violet) 22%, transparent)' }}
              title={props.kaiserLine}
            >
              {props.kaiserLine}
            </p>
            <form className={`${SIM_ACTION_ROW} mt-1`} onSubmit={props.onCommandSubmit}>
              <label htmlFor="hull-lab-cmd-mini" className="sr-only">
                Directive
              </label>
              <input
                id="hull-lab-cmd-mini"
                type="text"
                enterKeyHint="send"
                placeholder="Directive…"
                value={props.commandInput}
                onChange={(e) => props.setCommandInput(e.target.value)}
                className={`${SIM_CTL_H} min-w-0 flex-1 rounded border border-white/22 bg-neutral-950/95 px-2 py-0.5 font-[family-name:var(--font-body)] text-[clamp(10px,2.4vw,12px)] text-[var(--color-mzk-reactor-white)] outline-none placeholder:text-white/40 focus-visible:border-[color-mix(in_srgb,var(--color-mzk-plasma)_45%,white)] focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--color-mzk-plasma)_35%,transparent)]`}
              />
              <CockpitPrimaryActuator
                type="submit"
                aria-label="Execute directive"
                className="!min-h-8 !shrink-0 !rounded-md !px-3 !py-1.5 !text-[9px] !tracking-[0.12em]"
              >
                Go
              </CockpitPrimaryActuator>
              <button
                type="button"
                className="h-8 shrink-0 rounded border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_28%,transparent)] bg-black/70 px-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)] hover:bg-black/85"
                onClick={() => setDeckExpanded(true)}
                title="Expand full command deck"
              >
                More
              </button>
            </form>
            <div className={`${SIM_ACTION_ROW} mt-1 justify-center border-t border-white/10 pt-1`}>
              <button
                type="button"
                title="Hold to capture speech"
                className={`${SIM_CTL_H} shrink-0 rounded border px-2 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] ${labEase} ${
                  props.avatarListening ?
                    'border-[color-mix(in_srgb,var(--color-mzk-gold)_48%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-warning-orange)_22%,black)] text-[var(--color-mzk-reactor-white)]'
                  : 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_22%,transparent)] bg-black/60 text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_96%,var(--color-mzk-plasma-ice))]'
                } ${props.voice.supportsStt ? '' : 'cursor-not-allowed opacity-55'} `}
                disabled={!props.voice.supportsStt}
                {...props.pushToTalkProps}
              >
                PTT
              </button>
              <LabPad
                disabled={!props.voice.supportsStt}
                className={`${SIM_CTL_H} !px-2 !py-0 !text-[8px]`}
                onClick={() => props.voice.startMicTap()}
              >
                Mic
              </LabPad>
              <LabPad
                disabled={!props.sessionId}
                className={`${SIM_CTL_H} !px-2 !py-0 !text-[8px]`}
                onClick={() => void props.onVoiceNormalize()}
              >
                Voice
              </LabPad>
            </div>
          </>
        : <>
        <div className="mb-1 flex items-center justify-between gap-1">
          <button
            type="button"
            className="rounded border border-white/20 bg-black/50 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_80%,white)] hover:bg-black/70 pointer-coarse:min-h-10"
            onClick={() => setDeckExpanded(false)}
          >
            Minimize ▴
          </button>
          {props.subtitleStreaming ?
            <span className="font-mono text-[clamp(8px,1.8vw,10px)] uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)]">
              Live stream
            </span>
          : <span className="w-8 shrink-0" aria-hidden />}
        </div>
        <p
          className="border-b border-white/12 pb-1 text-center font-[family-name:var(--font-display)] text-[clamp(0.68rem,2.4vw,0.88rem)] font-semibold leading-tight text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_98%,white)]"
          style={{
            textShadow:
              '0 0 1px rgba(0,0,0,1), 0 0 14px color-mix(in srgb, var(--color-mzk-plasma-violet) 28%, transparent)',
          }}
        >
          {props.kaiserLine}
        </p>

        <div
          role="tablist"
          aria-label="Hull deck sections"
          className={`${SIM_TAB_STRIP} mt-1.5`}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault()
              focusAdjacentDeckTab(1)
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault()
              focusAdjacentDeckTab(-1)
            } else if (e.key === 'Home') {
              e.preventDefault()
              activateDeckTab(DECK_TABS[0]!.id)
            } else if (e.key === 'End') {
              e.preventDefault()
              activateDeckTab(DECK_TABS[DECK_TABS.length - 1]!.id)
            }
          }}
        >
          {DECK_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`${deckTabId}-tab-${id}`}
              aria-selected={deckTab === id}
              tabIndex={deckTab === id ? 0 : -1}
              aria-controls={`${deckTabId}-panel-${id}`}
              className={`${SIM_TAB_BTN} ${deckTab === id ? SIM_TAB_BTN_ACTIVE : ''} pointer-coarse:min-h-11`}
              onClick={() => setDeckTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {deckTab === 'command' ?
          <div
            role="tabpanel"
            id={`${deckTabId}-panel-command`}
            aria-labelledby={`${deckTabId}-tab-command`}
            className="mt-1.5 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-1.5"
          >
            <form className={`${SIM_ACTION_ROW}`} onSubmit={props.onCommandSubmit}>
              <textarea
                id="hull-lab-cmd"
                rows={2}
                placeholder="Directive…"
                value={props.commandInput}
                onChange={(e) => props.setCommandInput(e.target.value)}
                className="min-h-[2.75rem] min-w-0 flex-[1_1_min(100%,160px)] resize-y rounded-md border border-white/22 bg-neutral-950/95 px-[clamp(0.3rem,1.2vw,0.5rem)] py-[clamp(0.25rem,1vw,0.38rem)] font-[family-name:var(--font-body)] text-[clamp(10px,2.5vw,13px)] text-[var(--color-mzk-reactor-white)] outline-none placeholder:text-white/45 ring-offset-2 ring-offset-[#070910] focus-visible:border-[color-mix(in_srgb,var(--color-mzk-plasma)_45%,white)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-mzk-plasma)_40%,transparent)] sm:flex-[1_1_220px]"
              />
              <CockpitPrimaryActuator
                type="submit"
                className={`${SIM_CTL_H} shrink-0 px-[clamp(0.55rem,2.2vw,0.95rem)] py-[clamp(0.3rem,1.2vw,0.45rem)] text-[clamp(8px,2.2vw,11px)] pointer-coarse:min-h-11`}
              >
                Execute
              </CockpitPrimaryActuator>
            </form>

            <div className={`${SIM_ACTION_ROW} mt-1.5`}>
              <button
                type="button"
                title="Hold to capture speech"
                className={`${SIM_CTL_H} rounded-md border px-[clamp(0.4rem,1.6vw,0.65rem)] py-[clamp(0.28rem,1.1vw,0.38rem)] font-mono text-[clamp(9px,2.3vw,11px)] font-semibold uppercase tracking-[0.07em] pointer-coarse:min-h-11 sm:min-h-[34px] ${labEase} ${
                  props.avatarListening ?
                    'border-[color-mix(in_srgb,var(--color-mzk-gold)_48%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-warning-orange)_22%,black)] text-[var(--color-mzk-reactor-white)]'
                  : 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_22%,transparent)] bg-black/60 text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_96%,var(--color-mzk-plasma-ice))]'
                } ${props.voice.supportsStt ? '' : 'cursor-not-allowed opacity-55'} `}
                disabled={!props.voice.supportsStt}
                {...props.pushToTalkProps}
              >
                PTT
              </button>
              <LabPad disabled={!props.voice.supportsStt} className={`${SIM_CTL_H} text-[clamp(9px,2.2vw,10px)] pointer-coarse:min-h-11`} onClick={() => props.voice.startMicTap()}>
                Mic tap
              </LabPad>
              <LabPad disabled={!props.sessionId} className={`${SIM_CTL_H} text-[clamp(9px,2.2vw,10px)] pointer-coarse:min-h-11`} onClick={() => void props.onVoiceNormalize()}>
                Voice cmd
              </LabPad>
            </div>

            <details className="group mt-1.5 rounded-md border border-[color-mix(in_srgb,var(--color-mzk-plasma)_12%,transparent)] bg-black/35 px-1.5 py-1">
              <summary className="cursor-pointer list-none font-mono text-[8px] uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_78%,transparent)] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="text-[color-mix(in_srgb,var(--color-mzk-gold-core)_75%,transparent)] group-open:rotate-90 inline-block transition-transform">
                  ▸
                </span>{' '}
                Activity log
              </summary>
              <div className="mt-2 grid gap-2 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-2 font-mono text-[9px] text-[color-mix(in_srgb,var(--color-mzk-silver)_88%,transparent)]">
                {props.voice.liveTranscript ?
                  <p className="text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)]">
                    <span className="uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
                      Live STT ·{' '}
                    </span>
                    {props.voice.liveTranscript}
                  </p>
                : null}
                {props.assistantStream.trim() ?
                  <p className="text-[color-mix(in_srgb,var(--color-mzk-plasma)_90%,white)]">
                    <span className="uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
                      Stream ·{' '}
                    </span>
                    {props.assistantStream}
                  </p>
                : props.transcript ?
                  <p>{props.transcript}</p>
                : (
                  <p className="text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_72%,transparent)]">No live voice or transcript yet.</p>
                )}
              </div>
            </details>
          </div>
        : null}

        {deckTab === 'combat' ?
          <div
            role="tabpanel"
            id={`${deckTabId}-panel-combat`}
            aria-labelledby={`${deckTabId}-tab-combat`}
            className="mt-1.5 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-1.5"
          >
            <div className={`${SIM_ACTION_ROW}`}>
              <label htmlFor="hull-lab-mode" className="sr-only">
                Personality mode
              </label>
              <select
                id="hull-lab-mode"
                value={props.personalityMode}
                onChange={(e) => props.onPersonalityModeChange(e.target.value as PersonalityMode)}
                className={`max-w-[min(220px,86vw)] ${SIM_CTL_H} cursor-pointer rounded-md border border-white/28 bg-neutral-950 px-2 py-1 font-mono text-[clamp(10px,2.4vw,12px)] uppercase tracking-[0.05em] text-white outline-none ring-offset-2 ring-offset-[#070910] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-mzk-plasma)_50%,white)] sm:max-w-[min(200px,48vw)] pointer-coarse:min-h-11`}
              >
                {PERSONALITY_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <label className={`${SIM_ACTION_ROW} min-h-0 cursor-pointer items-center gap-1.5 rounded-md border border-white/22 bg-black/70 px-2 py-1 font-mono text-[clamp(9px,2.2vw,11px)] uppercase tracking-[0.05em] text-white/90`}>
                <input
                  type="checkbox"
                  checked={props.strictWake}
                  onChange={(e) => props.onStrictWakeChange(e.target.checked)}
                  className="h-3 w-3 accent-[var(--color-mzk-gold-core)]"
                />
                Wake gate
              </label>
              <CockpitPad tone="plasma" disabled={!props.sessionId} onClick={props.onRunDiagnostics} className={`${SIM_CTL_H} py-1.5 text-[clamp(9px,2.2vw,11px)] sm:py-1 pointer-coarse:min-h-11`}>
                Diagnose
              </CockpitPad>
              <CockpitPad
                tone="plasma"
                disabled={props.tacticalLoading}
                onClick={props.onLoadTactical}
                className={`${SIM_CTL_H} py-1.5 text-[clamp(9px,2.2vw,11px)] sm:py-1 pointer-coarse:min-h-11`}
              >
                {props.tacticalLoading ? 'Env…' : 'Tactical'}
              </CockpitPad>
            </div>

            <p className="mt-1 font-mono text-[clamp(8px,1.85vw,10px)] uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_76%,white)]">
              Sequence bus — demo moves
            </p>
            <div className="mt-1 grid grid-cols-2 gap-[clamp(0.2rem,0.8vw,0.28rem)] min-[520px]:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {KAISER_MOVES.map((m) => (
                <LabPad key={m} disabled={!props.sessionId} className="min-h-[32px] max-w-none truncate py-1.5 text-[clamp(9px,2.1vw,10px)] sm:min-h-[30px] sm:max-w-[130px] sm:py-1 pointer-coarse:min-h-11" onClick={() => props.onDemoMove(m)}>
                  {m}
                </LabPad>
              ))}
            </div>

            {props.tacticalSnippet ?
              <p className="mt-2 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-2 font-mono text-[9px] leading-snug text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_88%,silver)]">
                <span className="uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
                  Tactical envelope ·{' '}
                </span>
                {props.tacticalSnippet}
              </p>
            : null}
          </div>
        : null}

        {deckTab === 'twin' ?
          <div
            role="tabpanel"
            id={`${deckTabId}-panel-twin`}
            aria-labelledby={`${deckTabId}-tab-twin`}
            className="mt-1.5 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-1.5"
          >
            <p className="text-center font-mono text-[clamp(9px,2.1vw,11px)] leading-snug text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)]">
              Twin uplink · hull telemetry and advisories
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <div className="grid w-full grid-cols-2 gap-1.5 min-[420px]:grid-cols-4">
                <MicroBar label="PH" pct={d?.photon_power_pct ?? 0} title="Photon power (%)" />
                <MicroBar label="SY" pct={d?.sync_rate_pct ?? 0} title="Sync rate (%)" />
                <MicroBar label="TH" pct={d?.heat_level_pct ?? 0} title="Thermal load (%)" />
                <MicroBar label="AR" pct={d?.armor_integrity_pct ?? 0} title="Armor integrity (%)" />
              </div>
            </div>
            <div className="mt-2 grid gap-2 rounded-md border border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] bg-black/30 px-1.5 py-2 font-mono text-[9px] text-[color-mix(in_srgb,var(--color-mzk-silver)_88%,transparent)] sm:grid-cols-2">
              <p>
                <span className="uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
                  Mode ·{' '}
                </span>
                {formatHudEnum(d?.mode)}
              </p>
              <p>
                <span className="uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
                  Posture ·{' '}
                </span>
                {formatHudEnum(d?.operational_state)}
              </p>
              <p>
                <span className="uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
                  Move ·{' '}
                </span>
                {d?.last_demo_move ? formatHudEnum(d.last_demo_move) : '—'}
              </p>
              <p>
                <span className="uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
                  Stress ·{' '}
                </span>
                {(d?.structural_stress_pct ?? 0).toFixed(1)}%
              </p>
              {d?.alerts_active?.length ?
                <ul className="sm:col-span-2">
                  {d.alerts_active.map((a, i) => (
                    <li key={`${i}-${a.slice(0, 16)}`} className="border-l border-[color-mix(in_srgb,var(--color-mzk-photon-red)_45%,transparent)] py-0.5 pl-2 text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_90%,silver)]">
                      {a}
                    </li>
                  ))}
                </ul>
              : (
                <p className="text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_72%,transparent)] sm:col-span-2">Advisory stack empty.</p>
              )}
            </div>
          </div>
        : null}
        </>
        }
        </div>
      </div>
    </div>
  )
}
