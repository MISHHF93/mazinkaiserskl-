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
  SIM_CONSOLE_RAIL_BTN,
  SIM_CONSOLE_RAIL_BTN_ACTIVE,
  SIM_HULL_DECK_ANCHOR,
  SIM_HUD_TOP_STATUS_STRIP,
  SIM_SKL_ANGULAR_PANEL,
} from './cockpitControls'
import { formatHudEnum } from './cockpitUtils'

/** Props for instrumentation composited on the SKL hull surface (SIMULATION). */
export type HullInstrumentOverlayProps = {
  cockpitExperienceMode: CockpitExperienceMode
  diagnosticSurfaceActive: boolean
  onDiagnosticSurfaceChange: (open: boolean) => void
  ttsSpeaking: boolean

  hud: MechaHudState | null
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
  onCycleHullAnimationTest: () => void
  nextHullAnimationTestMove: string
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
      className="rounded border border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_38%,var(--color-mzk-smoke-panel)_22%)] bg-black/82 px-[clamp(3px,0.9vw,7px)] py-[clamp(2px,0.45vw,4px)] font-mono text-[clamp(7px,1.6vw,9px)] uppercase tracking-[0.05em] text-[color-mix(in_srgb,var(--color-mzk-skull-bone)_92%,white)] shadow-[0_2px_10px_rgba(0,0,0,0.6)] backdrop-blur-md"
    >
      <span className="text-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_82%,transparent)]">{k}</span>{' '}
      <span className="text-[color-mix(in_srgb,var(--color-mzk-skull-bone)_94%,white)]">{v}</span>
    </span>
  )
}

function VitalBar({ label, pct, title }: { label: string; pct: number; title: string }) {
  const p = Math.min(100, Math.max(0, pct))
  return (
    <div className="min-w-0 flex-1" title={title}>
      <div className="flex justify-between font-mono text-[7px] uppercase tracking-[0.04em] text-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_90%,white)] sm:text-[8px]">
        <span className="truncate">{label}</span>
        <span className="tabular-nums">{p.toFixed(0)}</span>
      </div>
      <div className="mt-0.5 h-[3px] overflow-hidden rounded-sm bg-black/85 ring-1 ring-[color-mix(in_srgb,var(--color-mzk-blood-energy)_28%,black)] sm:h-1">
        <div
          className="h-full bg-[color-mix(in_srgb,var(--color-mzk-blood-energy)_55%,var(--color-mzk-inferno-yellow)_35%)]"
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  )
}

type ConsoleSection = 'pilot' | 'combat' | 'hull'

const CONSOLE_RAIL: readonly { id: ConsoleSection; label: string; hint: string }[] = [
  { id: 'pilot', label: 'Pilot', hint: 'Voice & log' },
  { id: 'combat', label: 'Combat', hint: 'Moves & ops' },
  { id: 'hull', label: 'Hull', hint: 'Status' },
] as const

export function HullInstrumentOverlay(props: HullInstrumentOverlayProps) {
  const d = props.hud
  const { diagnosticSurfaceActive, onDiagnosticSurfaceChange } = props
  const labEase = '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)] duration-[var(--duration-mzk-short)]'
  const [consoleSection, setConsoleSection] = useState<ConsoleSection>('pilot')
  const deckTabId = useId()

  useEffect(() => {
    if (!diagnosticSurfaceActive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDiagnosticSurfaceChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [diagnosticSurfaceActive, onDiagnosticSurfaceChange])

  const focusAdjacentConsoleSection = (dir: -1 | 1) => {
    const order = CONSOLE_RAIL.map((t) => t.id)
    const i = order.indexOf(consoleSection)
    const next = (i + dir + order.length) % order.length
    const nextId = order[next]!
    setConsoleSection(nextId)
    queueMicrotask(() => document.getElementById(`${deckTabId}-rail-${nextId}`)?.focus())
  }

  const activateConsoleSection = (id: ConsoleSection) => {
    setConsoleSection(id)
    queueMicrotask(() => document.getElementById(`${deckTabId}-rail-${id}`)?.focus())
  }

  const waveformActive = props.subtitleStreaming || props.ttsSpeaking
  const waveformHot = props.ttsSpeaking

  const openConsole = (section: ConsoleSection) => {
    setConsoleSection(section)
    onDiagnosticSurfaceChange(true)
  }

  return (
    <div role="region" aria-label="Hull instrument layer" className="pointer-events-none absolute inset-0 min-h-0">
      {/* Zone A — status strip (vitals always on) */}
      <div className={`${SIM_HUD_TOP_STATUS_STRIP}`}>
        <div className="grid w-full grid-cols-4 gap-x-1.5 gap-y-1 sm:max-w-[20rem]">
          <VitalBar label="PH" pct={d?.photon_power_pct ?? 0} title="Photon power (%)" />
          <VitalBar label="SY" pct={d?.sync_rate_pct ?? 0} title="Sync rate (%)" />
          <VitalBar label="TH" pct={d?.heat_level_pct ?? 0} title="Thermal load (%)" />
          <VitalBar label="AR" pct={d?.armor_integrity_pct ?? 0} title="Armor integrity (%)" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_8%,transparent)] pt-1.5">
          <MiniChip k="View" title="Cockpit experience" v={cockpitExperienceLabel(props.cockpitExperienceMode)} />
          <MiniChip
            k="Twin"
            title={props.twinStateLabel}
            v={props.twinStateLabel.length > 14 ? `${props.twinStateLabel.slice(0, 14)}…` : props.twinStateLabel}
          />
          <MiniChip k="Alert" v={(d?.tactical_alert ?? '—').slice(0, 18)} />
          <button
            type="button"
            title="Tactical console — pilot comms, combat bus, hull advisories"
            className={`rounded-[2px] border px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.14em] sm:text-[9px] ${
              diagnosticSurfaceActive ?
                'border-[color-mix(in_srgb,var(--color-mzk-inferno-yellow)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-blood-energy)_28%,black)] text-[var(--color-mzk-skull-bone)]'
              : 'border-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_40%,transparent)] bg-black/75 text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)] hover:bg-black/90'
            }`}
            onClick={() => onDiagnosticSurfaceChange(!diagnosticSurfaceActive)}
          >
            Console
          </button>
        </div>
      </div>

      {/* Zone B — command deck */}
      <div className={SIM_HULL_DECK_ANCHOR}>
        <HudDeckGrip
          title="Kaiser command — directive bar + voice; Console for full tactical sheet"
          className={`${SIM_SKL_ANGULAR_PANEL} w-full max-w-[min(100%,min(340px,calc(100vw-6.5rem)))] px-1 pb-1 pt-0.5 sm:px-1.5`}
        >
          <div className="flex w-full min-w-0 flex-col gap-0.5">
            <CockpitWaveformStrip active={waveformActive} hot={waveformHot} />
            <p
              className="line-clamp-1 hyphens-auto break-words border-b border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_22%,transparent)] pb-0.5 text-left font-mono text-[clamp(7px,1.7vw,9px)] font-medium leading-tight text-[color-mix(in_srgb,var(--color-mzk-skull-bone)_94%,white)] sm:text-center sm:text-[clamp(8px,1.85vw,10px)]"
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
                      Execute
                    </CockpitPrimaryActuator>
                  </div>
                  <button
                    type="button"
                    className="flex min-h-9 min-w-[44px] shrink-0 flex-1 items-center justify-center bg-[color-mix(in_srgb,black_50%,transparent)] px-2 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-inferno-yellow)_90%,white)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-mzk-blood-energy)_14%,black)] active:translate-y-px pointer-coarse:min-h-11 sm:min-h-8 sm:flex-initial sm:border-l sm:border-black/70"
                    onClick={() => openConsole('pilot')}
                    title="Open tactical console (Pilot)"
                  >
                    Console
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

      {/* Zone C — tactical console */}
      {diagnosticSurfaceActive ?
        <div className="pointer-events-auto fixed inset-0 z-[125] flex justify-end">
          <button
            type="button"
            aria-label="Close tactical console"
            className="h-full min-h-0 flex-1 bg-black/55 backdrop-blur-[2px]"
            onClick={() => onDiagnosticSurfaceChange(false)}
          />
          <aside
            className="flex h-full min-h-0 w-[min(100vw-0.5rem,min(520px,100vw))] max-w-[100vw] border-l border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_38%,var(--color-mzk-smoke-panel)_22%)] bg-[color-mix(in_srgb,var(--color-mzk-gunmetal)_97%,black)] shadow-[-12px_0_48px_rgba(0,0,0,0.85)]"
            aria-label="Tactical console"
          >
            <div
              className="flex w-12 shrink-0 flex-col gap-1 border-r border-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_28%,transparent)] bg-black/35 py-2 pl-1 pr-1"
              role="tablist"
              aria-label="Console sections"
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault()
                  focusAdjacentConsoleSection(1)
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  focusAdjacentConsoleSection(-1)
                } else if (e.key === 'Home') {
                  e.preventDefault()
                  activateConsoleSection(CONSOLE_RAIL[0]!.id)
                } else if (e.key === 'End') {
                  e.preventDefault()
                  activateConsoleSection(CONSOLE_RAIL[CONSOLE_RAIL.length - 1]!.id)
                }
              }}
            >
              {CONSOLE_RAIL.map(({ id, label, hint }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`${deckTabId}-rail-${id}`}
                  title={hint}
                  aria-selected={consoleSection === id}
                  tabIndex={consoleSection === id ? 0 : -1}
                  aria-controls={`${deckTabId}-panel-${id}`}
                  className={`${SIM_CONSOLE_RAIL_BTN} ${consoleSection === id ? SIM_CONSOLE_RAIL_BTN_ACTIVE : ''}`}
                  onClick={() => setConsoleSection(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_35%,transparent)] px-2 py-1.5">
                <div className="min-w-0">
                  <p className="truncate font-[family-name:var(--font-display)] text-[clamp(0.72rem,2vw,0.88rem)] font-semibold uppercase tracking-[0.1em] text-[var(--color-mzk-skull-bone)]">
                    Tactical console
                  </p>
                  <p className="truncate font-mono text-[8px] uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_55%,transparent)]">
                    {CONSOLE_RAIL.find((x) => x.id === consoleSection)?.hint}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_45%,transparent)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)] hover:bg-white/5"
                  onClick={() => onDiagnosticSurfaceChange(false)}
                >
                  Esc
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 pt-2">
                {consoleSection === 'pilot' ?
                  <div
                    role="tabpanel"
                    id={`${deckTabId}-panel-pilot`}
                    aria-labelledby={`${deckTabId}-rail-pilot`}
                    className="space-y-3"
                  >
                    <p className="font-mono text-[9px] leading-relaxed text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_78%,white)]">
                      Type directives in the <strong>command bar</strong> below the hull — this panel is for voice and
                      the live log only.
                    </p>
                    <div className="flex w-full flex-nowrap gap-px overflow-hidden rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_22%,transparent)] bg-black/75 p-px shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5)]">
                      <button
                        type="button"
                        title="Hold to capture speech"
                        className={`min-h-9 flex-1 px-2 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.07em] pointer-coarse:min-h-11 sm:min-h-8 ${labEase} ${
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
                        className="!min-h-9 flex-1 !py-1.5 text-[9px] pointer-coarse:min-h-11 sm:!min-h-8"
                        onClick={() => props.voice.startMicTap()}
                      >
                        Mic tap
                      </LabPad>
                      <LabPad
                        disabled={!props.sessionId}
                        className="!min-h-9 flex-1 !py-1.5 text-[9px] pointer-coarse:min-h-11 sm:!min-h-8"
                        onClick={() => void props.onVoiceNormalize()}
                      >
                        Voice cmd
                      </LabPad>
                    </div>

                    <div>
                      <p className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_72%,transparent)]">
                        Activity log
                      </p>
                      <div className="max-h-[min(40vh,320px)] space-y-2 overflow-y-auto rounded-md border border-[color-mix(in_srgb,var(--color-mzk-plasma)_12%,transparent)] bg-black/40 px-2 py-2 font-mono text-[9px] text-[color-mix(in_srgb,var(--color-mzk-silver)_88%,transparent)]">
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
                          <p className="text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_72%,transparent)]">
                            No live voice or transcript yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                : null}

                {consoleSection === 'combat' ?
                  <div
                    role="tabpanel"
                    id={`${deckTabId}-panel-combat`}
                    aria-labelledby={`${deckTabId}-rail-combat`}
                    className="space-y-3"
                  >
                    <div className="flex flex-wrap items-center gap-1">
                      <label htmlFor="hull-lab-mode" className="sr-only">
                        Personality mode
                      </label>
                      <select
                        id="hull-lab-mode"
                        value={props.personalityMode}
                        onChange={(e) => props.onPersonalityModeChange(e.target.value as PersonalityMode)}
                        className="max-w-[min(220px,100%)] min-h-8 flex-1 cursor-pointer rounded-md border border-white/22 bg-neutral-950 px-2 py-1 font-mono text-[clamp(10px,2.2vw,11px)] uppercase tracking-[0.05em] text-white outline-none ring-offset-2 ring-offset-[#070910] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-mzk-plasma)_50%,white)] pointer-coarse:min-h-11"
                      >
                        {PERSONALITY_MODES.map((m) => (
                          <option key={m} value={m}>
                            {m.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      <label className="flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md border border-white/22 bg-black/70 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.05em] text-white/90 pointer-coarse:min-h-11">
                        <input
                          type="checkbox"
                          checked={props.strictWake}
                          onChange={(e) => props.onStrictWakeChange(e.target.checked)}
                          className="h-3 w-3 accent-[var(--color-mzk-gold-core)]"
                        />
                        Wake
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <CockpitPad
                        tone="plasma"
                        disabled={!props.sessionId}
                        onClick={props.onRunDiagnostics}
                        className="min-h-8 px-2 py-1.5 text-[9px] pointer-coarse:min-h-11"
                      >
                        Diagnose
                      </CockpitPad>
                      <CockpitPad
                        tone="plasma"
                        disabled={props.tacticalLoading}
                        onClick={props.onLoadTactical}
                        className="min-h-8 px-2 py-1.5 text-[9px] pointer-coarse:min-h-11"
                      >
                        {props.tacticalLoading ? 'Env…' : 'Tactical'}
                      </CockpitPad>
                    </div>

                    <div>
                      <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_76%,white)]">
                        Move bus
                      </p>
                      <CockpitPad
                        tone="plasma"
                        type="button"
                        disabled={!props.sessionId}
                        title="Cycles catalog moves; drives 3D hull via backend move-demo."
                        onClick={props.onCycleHullAnimationTest}
                        className="mb-1.5 flex w-full flex-col items-stretch gap-0.5 py-2 text-left normal-case tracking-normal sm:py-1.5 pointer-coarse:min-h-11"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">Test 3D hull</span>
                        <span className="text-[8px] font-mono uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_82%,transparent)]">
                          Next: {props.nextHullAnimationTestMove}
                        </span>
                      </CockpitPad>
                      <div className="grid grid-cols-2 gap-1 min-[400px]:grid-cols-3">
                        {KAISER_MOVES.map((m) => (
                          <LabPad
                            key={m}
                            disabled={!props.sessionId}
                            className="min-h-9 max-w-none truncate py-1.5 text-[9px] pointer-coarse:min-h-11"
                            onClick={() => props.onDemoMove(m)}
                          >
                            {m}
                          </LabPad>
                        ))}
                      </div>
                    </div>

                    {props.tacticalSnippet ?
                      <p className="border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-2 font-mono text-[9px] leading-snug text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_88%,silver)]">
                        <span className="uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
                          Tactical ·{' '}
                        </span>
                        {props.tacticalSnippet}
                      </p>
                    : null}
                  </div>
                : null}

                {consoleSection === 'hull' ?
                  <div
                    role="tabpanel"
                    id={`${deckTabId}-panel-hull`}
                    aria-labelledby={`${deckTabId}-rail-hull`}
                    className="space-y-2"
                  >
                    <p className="font-mono text-[9px] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_78%,white)]">
                      Core meters (PH / SY / TH / AR) stay in the <strong>top status strip</strong> so they are always
                      visible during flight.
                    </p>
                    <div className="grid gap-2 rounded-md border border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] bg-black/30 px-2 py-2 font-mono text-[9px] text-[color-mix(in_srgb,var(--color-mzk-silver)_88%,transparent)] sm:grid-cols-2">
                      <p>
                        <span className="uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
                          Mode ·{' '}
                        </span>
                        {formatHudEnum(d?.mode)}
                      </p>
                      <p>
                        <span className="uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
                          Posture ·{' '}
                        </span>
                        {formatHudEnum(d?.operational_state)}
                      </p>
                      <p>
                        <span className="uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
                          Move ·{' '}
                        </span>
                        {d?.last_demo_move ? formatHudEnum(d.last_demo_move) : '—'}
                      </p>
                      <p>
                        <span className="uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
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
                        <p className="text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_72%,transparent)] sm:col-span-2">
                          Advisory stack empty.
                        </p>
                      )}
                    </div>
                  </div>
                : null}
              </div>
            </div>
          </aside>
        </div>
      : null}
    </div>
  )
}
