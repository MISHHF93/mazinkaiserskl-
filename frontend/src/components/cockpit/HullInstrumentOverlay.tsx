import type { FormEvent } from 'react'
import { useEffect, useId, useState } from 'react'
import type { MechaHudState, PersonalityMode } from '../../types'
import { KAISER_MOVES, PERSONALITY_MODES } from '../../types'
import type { VoiceConsoleSlice, VoicePushToTalkProps } from './CommandConsole'
import { CockpitWaveformStrip } from './CockpitWaveformStrip'
import type { CockpitExperienceMode } from './cockpitExperienceMode'
import { cockpitExperienceLabel } from './cockpitExperienceMode'
import {
  CockpitPad,
  CockpitPrimaryActuator,
  HudDeckGrip,
  HudSegmentRail,
  LabPad,
  SIM_HUD_METRICS_ANCHOR,
  SIM_HULL_DECK_ANCHOR,
  SIM_ACTION_ROW,
  SIM_CTL_H,
  SIM_SKL_ANGULAR_PANEL,
  SIM_TAB_STRIP,
  SIM_TAB_BTN,
  SIM_TAB_BTN_ACTIVE,
} from './cockpitControls'
import { formatHudEnum } from './cockpitUtils'

/** Props for instrumentation composited on the SKL hull surface (SIMULATION). */
export type HullInstrumentOverlayProps = {
  cockpitExperienceMode: CockpitExperienceMode
  diagnosticSurfaceActive: boolean
  onDiagnosticSurfaceChange: (open: boolean) => void
  ttsSpeaking: boolean

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
      className="rounded border border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_38%,var(--color-mzk-smoke-panel)_22%)] bg-black/82 px-[clamp(3px,0.9vw,7px)] py-[clamp(2px,0.45vw,4px)] font-mono text-[clamp(8px,1.7vw,10px)] uppercase tracking-[0.05em] text-[color-mix(in_srgb,var(--color-mzk-skull-bone)_92%,white)] shadow-[0_2px_10px_rgba(0,0,0,0.6)] backdrop-blur-md"
    >
      <span className="text-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_82%,transparent)]">{k}</span>{' '}
      <span className="text-[color-mix(in_srgb,var(--color-mzk-skull-bone)_94%,white)]">{v}</span>
    </span>
  )
}

function MicroBar({ label, pct, title }: { label: string; pct: number; title: string }) {
  const p = Math.min(100, Math.max(0, pct))
  return (
    <div className="min-w-[min(56px,22vw)] flex-1" title={title}>
      <div className="flex justify-between font-mono text-[clamp(8px,1.8vw,10px)] uppercase tracking-[0.05em] text-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_92%,white)]">
        <span className="truncate">{label}</span>
        <span className="tabular-nums">{p.toFixed(0)}</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-sm bg-black/85 ring-1 ring-[color-mix(in_srgb,var(--color-mzk-blood-energy)_32%,black)]">
        <div
          className="h-full bg-[color-mix(in_srgb,var(--color-mzk-blood-energy)_55%,var(--color-mzk-inferno-yellow)_35%)]"
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  )
}

type DeckTab = 'command' | 'combat' | 'twin'

const DECK_TABS: readonly { id: DeckTab; label: string }[] = [
  { id: 'command', label: 'Command' },
  { id: 'combat', label: 'Combat' },
  { id: 'twin', label: 'Twin' },
] as const

export function HullInstrumentOverlay(props: HullInstrumentOverlayProps) {
  const d = props.hud
  const { diagnosticSurfaceActive, onDiagnosticSurfaceChange } = props
  const labEase = '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)] duration-[var(--duration-mzk-short)]'
  const [meterHudOpen, setMeterHudOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState<DeckTab>('command')
  const deckTabId = useId()

  useEffect(() => {
    if (!diagnosticSurfaceActive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDiagnosticSurfaceChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [diagnosticSurfaceActive, onDiagnosticSurfaceChange])

  const focusAdjacentDeckTab = (dir: -1 | 1) => {
    const order = DECK_TABS.map((t) => t.id)
    const i = order.indexOf(drawerTab)
    const next = (i + dir + order.length) % order.length
    const nextId = order[next]!
    setDrawerTab(nextId)
    queueMicrotask(() => document.getElementById(`${deckTabId}-tab-${nextId}`)?.focus())
  }

  const activateDeckTab = (id: DeckTab) => {
    setDrawerTab(id)
    queueMicrotask(() => document.getElementById(`${deckTabId}-tab-${id}`)?.focus())
  }

  const waveformActive = props.subtitleStreaming || props.ttsSpeaking
  const waveformHot = props.ttsSpeaking

  return (
    <div role="region" aria-label="Hull instrument layer" className="pointer-events-none absolute inset-0 min-h-0">
      <div className={`${SIM_HUD_METRICS_ANCHOR} pointer-events-auto`}>
        <MiniChip k="Mode" title="Cockpit experience" v={cockpitExperienceLabel(props.cockpitExperienceMode)} />
        <MiniChip k="Twin" title={props.twinStateLabel} v={props.twinStateLabel.length > 18 ? `${props.twinStateLabel.slice(0, 18)}…` : props.twinStateLabel} />
        <MiniChip k="Alert" v={(d?.tactical_alert ?? '—').slice(0, 20)} />
        {meterHudOpen ?
          <>
            <button
              type="button"
              title="Hide gauges"
              className="rounded border border-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_40%,transparent)] bg-black/80 px-1 py-0.5 font-mono text-[7px] uppercase text-[color-mix(in_srgb,var(--color-mzk-skull-bone)_88%,white)]"
              onClick={() => setMeterHudOpen(false)}
            >
              ×
            </button>
            <MicroBar label="PH" pct={d?.photon_power_pct ?? 0} title="Photon power (%)" />
            <MicroBar label="SY" pct={d?.sync_rate_pct ?? 0} title="Sync rate (%)" />
            <MicroBar label="TH" pct={d?.heat_level_pct ?? 0} title="Thermal load (%)" />
            <MicroBar label="AR" pct={d?.armor_integrity_pct ?? 0} title="Armor integrity (%)" />
          </>
        : (
          <button
            type="button"
            title="Hull instrument gauges"
            className="rounded border border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_35%,transparent)] bg-black/78 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-inferno-yellow)_88%,white)] shadow-sm backdrop-blur-sm hover:bg-black/90 sm:px-2 sm:text-[8px]"
            onClick={() => setMeterHudOpen(true)}
          >
            <span className="sm:hidden">G</span>
            <span className="hidden sm:inline">Gauges</span>
          </button>
        )}
        <button
          type="button"
          title="Open diagnostics — telemetry, moves, twin bus"
          className={`rounded border px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.14em] sm:px-2 sm:text-[8px] ${
            props.diagnosticSurfaceActive ?
              'border-[color-mix(in_srgb,var(--color-mzk-inferno-yellow)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-blood-energy)_28%,black)] text-[var(--color-mzk-skull-bone)]'
            : 'border-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_40%,transparent)] bg-black/75 text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_78%,white)] hover:bg-black/90'
          }`}
          onClick={() => props.onDiagnosticSurfaceChange(!props.diagnosticSurfaceActive)}
        >
          Diag
        </button>
      </div>

      <div className={SIM_HULL_DECK_ANCHOR}>
        <HudDeckGrip
          title="Kaiser command — Diagnostics for full bus"
          className={`${SIM_SKL_ANGULAR_PANEL} w-full px-1 pb-1 pt-0.5 sm:px-1.5`}
        >
          <div className="flex w-full min-w-0 flex-col gap-1">
            <CockpitWaveformStrip active={waveformActive} hot={waveformHot} />
            <p
              className="line-clamp-2 hyphens-auto break-words border-b border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_22%,transparent)] pb-0.5 text-left font-mono text-[clamp(8px,1.85vw,10px)] font-medium leading-snug text-[color-mix(in_srgb,var(--color-mzk-skull-bone)_94%,white)] sm:text-center"
              style={{
                textShadow: '0 0 12px color-mix(in srgb, var(--color-mzk-blood-energy) 35%, transparent)',
              }}
              title={props.kaiserLine}
            >
              {props.kaiserLine}
            </p>
            <form className="w-full min-w-0" onSubmit={props.onCommandSubmit}>
              <HudSegmentRail className="w-full flex-col sm:flex-row sm:flex-nowrap">
                <div className="flex min-h-9 min-w-0 w-full flex-1 items-center bg-[color-mix(in_srgb,black_58%,transparent)] px-1.5 py-0.5 pointer-coarse:min-h-11 sm:min-h-8 sm:px-2">
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
                    className="min-h-[28px] min-w-0 flex-1 border-0 bg-transparent py-0.5 font-[family-name:var(--font-body)] text-[clamp(10px,2.4vw,12px)] text-[var(--color-mzk-skull-bone)] outline-none placeholder:text-white/40 focus-visible:ring-0"
                  />
                </div>
                <div className="flex min-h-9 w-full min-w-0 shrink-0 divide-x divide-black/70 border-t border-black/70 pointer-coarse:min-h-11 sm:min-h-8 sm:w-auto sm:border-t-0 sm:divide-x-0">
                  <div className="flex min-h-9 min-w-0 flex-1 items-stretch pointer-coarse:min-h-11 sm:min-h-8 sm:flex-initial sm:border-l sm:border-black/70">
                    <CockpitPrimaryActuator
                      type="submit"
                      aria-label="Execute directive"
                      className="!h-auto w-full !min-h-9 !rounded-none !border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_45%,transparent)] !bg-[color-mix(in_srgb,var(--color-mzk-blood-energy)_18%,black)] !px-2.5 !py-1 !text-[9px] !tracking-[0.12em] text-[var(--color-mzk-skull-bone)] pointer-coarse:!min-h-11 sm:!min-h-8"
                    >
                      Go
                    </CockpitPrimaryActuator>
                  </div>
                  <button
                    type="button"
                    className="flex min-h-9 min-w-[44px] shrink-0 flex-1 items-center justify-center bg-[color-mix(in_srgb,black_50%,transparent)] px-2 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-inferno-yellow)_90%,white)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-mzk-blood-energy)_14%,black)] active:translate-y-px pointer-coarse:min-h-11 sm:min-h-8 sm:flex-initial sm:border-l sm:border-black/70"
                    onClick={() => {
                      props.onDiagnosticSurfaceChange(true)
                      setDrawerTab('command')
                    }}
                    title="Full diagnostics & sequence bus"
                  >
                    Bus
                  </button>
                </div>
              </HudSegmentRail>
            </form>
            <HudSegmentRail className="w-full justify-center">
              <button
                type="button"
                title="Hold to capture speech"
                className={`flex h-auto min-h-9 flex-1 shrink-0 border-0 px-2 py-1.5 font-mono text-[8px] font-semibold uppercase tracking-[0.08em] pointer-coarse:min-h-11 pointer-coarse:py-2 sm:min-h-8 sm:py-1 ${labEase} ${
                  props.avatarListening ?
                    'border-[color-mix(in_srgb,var(--color-mzk-inferno-yellow)_48%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-blood-energy)_26%,black)] text-[var(--color-mzk-skull-bone)]'
                  : 'bg-[color-mix(in_srgb,black_45%,transparent)] text-[color-mix(in_srgb,var(--color-mzk-skull-bone)_96%,var(--color-mzk-smoke-panel))]'
                } ${props.voice.supportsStt ? '' : 'cursor-not-allowed opacity-55'} `}
                disabled={!props.voice.supportsStt}
                {...props.pushToTalkProps}
              >
                PTT
              </button>
              <LabPad
                disabled={!props.voice.supportsStt}
                className="!flex h-auto min-h-9 flex-1 items-center justify-center !rounded-none border-0 !py-1.5 !text-[8px] pointer-coarse:min-h-11 pointer-coarse:!py-2 sm:!min-h-8 sm:!py-1"
                onClick={() => props.voice.startMicTap()}
              >
                Mic
              </LabPad>
              <LabPad
                disabled={!props.sessionId}
                className="!flex h-auto min-h-9 flex-1 items-center justify-center !rounded-none border-0 !py-1.5 !text-[8px] pointer-coarse:min-h-11 pointer-coarse:!py-2 sm:!min-h-8 sm:!py-1"
                onClick={() => void props.onVoiceNormalize()}
              >
                Voice
              </LabPad>
            </HudSegmentRail>
          </div>
        </HudDeckGrip>
      </div>

      {props.diagnosticSurfaceActive ?
        <div className="pointer-events-auto fixed inset-0 z-[125] flex justify-end">
          <button
            type="button"
            aria-label="Close diagnostics"
            className="h-full min-h-0 flex-1 bg-black/55 backdrop-blur-[2px]"
            onClick={() => props.onDiagnosticSurfaceChange(false)}
          />
          <aside
            className="flex h-full min-h-0 w-[min(100vw-1rem,440px)] max-w-[100vw] flex-col border-l border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_38%,var(--color-mzk-smoke-panel)_22%)] bg-[color-mix(in_srgb,var(--color-mzk-gunmetal)_97%,black)] shadow-[-12px_0_48px_rgba(0,0,0,0.85)]"
            aria-label="Diagnostics drawer"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_35%,transparent)] px-2 py-1.5">
              <span className="font-[family-name:var(--font-display)] text-[clamp(0.72rem,2.2vw,0.9rem)] font-semibold uppercase tracking-[0.12em] text-[var(--color-mzk-skull-bone)]">
                Diagnostics
              </span>
              <button
                type="button"
                className="rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_45%,transparent)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)] hover:bg-white/5"
                onClick={() => props.onDiagnosticSurfaceChange(false)}
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 pt-2">
              <div
                role="tablist"
                aria-label="Diagnostics sections"
                className={`${SIM_TAB_STRIP}`}
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
                    aria-selected={drawerTab === id}
                    tabIndex={drawerTab === id ? 0 : -1}
                    aria-controls={`${deckTabId}-panel-${id}`}
                    className={`${SIM_TAB_BTN} ${drawerTab === id ? SIM_TAB_BTN_ACTIVE : ''} pointer-coarse:min-h-11`}
                    onClick={() => setDrawerTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {drawerTab === 'command' ?
                <div
                  role="tabpanel"
                  id={`${deckTabId}-panel-command`}
                  aria-labelledby={`${deckTabId}-tab-command`}
                  className="mt-2 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-2"
                >
                  <form className={`${SIM_ACTION_ROW}`} onSubmit={props.onCommandSubmit}>
                    <textarea
                      id="hull-lab-cmd"
                      rows={3}
                      placeholder="Directive…"
                      value={props.commandInput}
                      onChange={(e) => props.setCommandInput(e.target.value)}
                      className="min-h-[3.25rem] min-w-0 flex-[1_1_min(100%,160px)] resize-y rounded-md border border-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_35%,transparent)] bg-[color-mix(in_srgb,black_90%,transparent)] px-[clamp(0.3rem,1.2vw,0.5rem)] py-[clamp(0.25rem,1vw,0.38rem)] font-[family-name:var(--font-body)] text-[clamp(10px,2.5vw,13px)] text-[var(--color-mzk-skull-bone)] outline-none placeholder:text-white/45 ring-offset-2 ring-offset-[#070910] focus-visible:border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_55%,white)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-mzk-blood-energy)_35%,transparent)] sm:flex-[1_1_220px]"
                    />
                    <CockpitPrimaryActuator
                      type="submit"
                      className={`${SIM_CTL_H} shrink-0 px-[clamp(0.55rem,2.2vw,0.95rem)] py-[clamp(0.3rem,1.2vw,0.45rem)] text-[clamp(8px,2.2vw,11px)] pointer-coarse:min-h-11`}
                    >
                      Execute
                    </CockpitPrimaryActuator>
                  </form>

                  <div className={`${SIM_ACTION_ROW} mt-2`}>
                    <button
                      type="button"
                      title="Hold to capture speech"
                      className={`${SIM_CTL_H} rounded-md border px-[clamp(0.4rem,1.6vw,0.65rem)] py-[clamp(0.28rem,1.1vw,0.38rem)] font-mono text-[clamp(9px,2.3vw,11px)] font-semibold uppercase tracking-[0.07em] pointer-coarse:min-h-11 sm:min-h-[34px] ${labEase} ${
                        props.avatarListening ?
                          'border-[color-mix(in_srgb,var(--color-mzk-inferno-yellow)_48%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-blood-energy)_24%,black)] text-[var(--color-mzk-skull-bone)]'
                        : 'border-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_28%,transparent)] bg-black/60 text-[color-mix(in_srgb,var(--color-mzk-skull-bone)_96%,var(--color-mzk-plasma-ice))]'
                      } ${props.voice.supportsStt ? '' : 'cursor-not-allowed opacity-55'} `}
                      disabled={!props.voice.supportsStt}
                      {...props.pushToTalkProps}
                    >
                      PTT
                    </button>
                    <LabPad
                      disabled={!props.voice.supportsStt}
                      className={`${SIM_CTL_H} text-[clamp(9px,2.2vw,10px)] pointer-coarse:min-h-11`}
                      onClick={() => props.voice.startMicTap()}
                    >
                      Mic tap
                    </LabPad>
                    <LabPad disabled={!props.sessionId} className={`${SIM_CTL_H} text-[clamp(9px,2.2vw,10px)] pointer-coarse:min-h-11`} onClick={() => void props.onVoiceNormalize()}>
                      Voice cmd
                    </LabPad>
                  </div>

                  <details className="group mt-2 rounded-md border border-[color-mix(in_srgb,var(--color-mzk-plasma)_12%,transparent)] bg-black/35 px-1.5 py-1">
                    <summary className="cursor-pointer list-none font-mono text-[8px] uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_78%,transparent)] marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="text-[color-mix(in_srgb,var(--color-mzk-inferno-yellow)_75%,transparent)] group-open:rotate-90 inline-block transition-transform">
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

              {drawerTab === 'combat' ?
                <div
                  role="tabpanel"
                  id={`${deckTabId}-panel-combat`}
                  aria-labelledby={`${deckTabId}-tab-combat`}
                  className="mt-2 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-2"
                >
                  <div className={`${SIM_ACTION_ROW}`}>
                    <label htmlFor="hull-lab-mode" className="sr-only">
                      Personality mode
                    </label>
                    <select
                      id="hull-lab-mode"
                      value={props.personalityMode}
                      onChange={(e) => props.onPersonalityModeChange(e.target.value as PersonalityMode)}
                      className={`max-w-[min(220px,86vw)] ${SIM_CTL_H} cursor-pointer rounded-md border border-white/22 bg-neutral-950 px-2 py-1 font-mono text-[clamp(10px,2.4vw,12px)] uppercase tracking-[0.05em] text-white outline-none ring-offset-2 ring-offset-[#070910] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-mzk-plasma)_50%,white)] sm:max-w-[min(200px,48vw)] pointer-coarse:min-h-11`}
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

                  <p className="mt-2 font-mono text-[clamp(8px,1.85vw,10px)] uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_76%,white)]">
                    Sequence bus — demo moves
                  </p>
                  <div className="mt-1 grid grid-cols-2 gap-[clamp(0.2rem,0.8vw,0.28rem)] min-[420px]:grid-cols-3">
                    {KAISER_MOVES.map((m) => (
                      <LabPad
                        key={m}
                        disabled={!props.sessionId}
                        className="min-h-[32px] max-w-none truncate py-1.5 text-[clamp(9px,2.1vw,10px)] sm:min-h-[30px] sm:max-w-[130px] sm:py-1 pointer-coarse:min-h-11"
                        onClick={() => props.onDemoMove(m)}
                      >
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

              {drawerTab === 'twin' ?
                <div
                  role="tabpanel"
                  id={`${deckTabId}-panel-twin`}
                  aria-labelledby={`${deckTabId}-tab-twin`}
                  className="mt-2 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-2"
                >
                  <p className="text-center font-mono text-[clamp(9px,2.1vw,11px)] leading-snug text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)]">
                    Twin uplink · hull telemetry and advisories
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <div className="grid w-full grid-cols-2 gap-1.5 min-[360px]:grid-cols-4">
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
                          <li
                            key={`${i}-${a.slice(0, 16)}`}
                            className="border-l border-[color-mix(in_srgb,var(--color-mzk-photon-red)_45%,transparent)] py-0.5 pl-2 text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_90%,silver)]"
                          >
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
            </div>
          </aside>
        </div>
      : null}
    </div>
  )
}
