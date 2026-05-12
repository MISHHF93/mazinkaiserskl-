import type { FormEvent } from 'react'
import { useEffect, useId } from 'react'
import type { MechaHudState, PersonalityMode } from '../../types'
import { KAISER_MOVES } from '../../types'
import type { VoiceConsoleSlice, VoicePushToTalkProps } from './CommandConsole'
import { CockpitWaveformStrip } from './CockpitWaveformStrip'
import { cockpitExperienceLabel } from './cockpitExperienceMode'
import {
  CockpitPad,
  CockpitPrimaryActuator,
  HudDeckGrip,
  HudSegmentRail,
  LabPad,
  SIM_HULL_DECK_ANCHOR,
  SIM_HUD_TOP_STATUS_STRIP,
  SIM_SKL_ANGULAR_PANEL,
} from './cockpitControls'
import { formatHudEnum } from './cockpitUtils'
import { SKL_ML_DEMO_PRESETS } from '../../avatar/demo/syntheticSklMoveBatches'

/** Props for instrumentation composited on the SKL hull surface (SIMULATION). */
export type HullInstrumentOverlayProps = {
  wsStatus: string
  ttsOn: boolean
  toggleTts: () => void
  onHudHelp: () => void

  diagnosticSurfaceActive: boolean
  onDiagnosticSurfaceChange: (open: boolean) => void
  ttsSpeaking: boolean

  hud: MechaHudState | null
  twinStateLabel: string
  kaiserLine: string
  subtitleStreaming: boolean
  personalityMode: PersonalityMode
  strictWake: boolean
  onStrictWakeChange: (v: boolean) => void
  onRunDiagnostics: () => void
  tacticalSnippet: string
  tacticalLoading: boolean
  onLoadTactical: () => void
  onDemoMove: (move: string) => void
  onMlDemoMove: (slug: string) => void
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
    <div className="w-[2.85rem] shrink-0 sm:w-[3.25rem]" title={`${title}: ${p}%`}>
      <div className="flex items-baseline justify-between gap-0.5 leading-none">
        <span className="font-mono text-[6px] uppercase tracking-[0.03em] text-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_88%,white)] sm:text-[7px]">
          {label}
        </span>
        <span className="font-mono text-[6px] tabular-nums text-[color-mix(in_srgb,var(--color-mzk-skull-bone)_85%,white)] sm:text-[7px]">
          {p.toFixed(0)}
        </span>
      </div>
      <div className="mt-px h-[2px] overflow-hidden rounded-sm bg-black/85 ring-1 ring-[color-mix(in_srgb,var(--color-mzk-blood-energy)_24%,black)]">
        <div
          className="h-full bg-[color-mix(in_srgb,var(--color-mzk-blood-energy)_55%,var(--color-mzk-inferno-yellow)_35%)]"
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  )
}

export function HullInstrumentOverlay(props: HullInstrumentOverlayProps) {
  const d = props.hud
  const { diagnosticSurfaceActive, onDiagnosticSurfaceChange } = props
  const labEase = '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)] duration-[var(--duration-mzk-short)]'
  const deckTabId = useId()

  useEffect(() => {
    if (!diagnosticSurfaceActive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDiagnosticSurfaceChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [diagnosticSurfaceActive, onDiagnosticSurfaceChange])

  const waveformActive = props.subtitleStreaming || props.ttsSpeaking
  const waveformHot = props.ttsSpeaking
  return (
    <div role="region" aria-label="Hull instrument layer" className="pointer-events-none absolute inset-0 min-h-0">
      {/* Zone A — single flat strip: compact vitals | status chips | uplink / session / TTS / help / console */}
      <div className={`${SIM_HUD_TOP_STATUS_STRIP}`}>
        <div className="flex min-w-0 shrink-0 items-center gap-0.5">
          <VitalBar label="PH" pct={d?.photon_power_pct ?? 0} title="Photon power (%)" />
          <VitalBar label="SY" pct={d?.sync_rate_pct ?? 0} title="Sync rate (%)" />
          <VitalBar label="TH" pct={d?.heat_level_pct ?? 0} title="Thermal load (%)" />
          <VitalBar label="AR" pct={d?.armor_integrity_pct ?? 0} title="Armor integrity (%)" />
        </div>
        <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-0.5 pl-0.5">
            <MiniChip k="View" title="Cockpit experience" v={cockpitExperienceLabel('UNIFIED')} />
            <MiniChip
              k="Twin"
              title={props.twinStateLabel}
              v={props.twinStateLabel.length > 12 ? `${props.twinStateLabel.slice(0, 12)}…` : props.twinStateLabel}
            />
            <MiniChip k="Alert" v={(d?.tactical_alert ?? '—').slice(0, 14)} />
            <span
              className={`shrink-0 rounded-[2px] border px-1 py-0.5 font-mono text-[7px] uppercase tracking-[0.08em] sm:text-[8px] ${
                props.wsStatus === 'connecting'
                  ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_40%,transparent)] bg-black/60 text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_92%,white)] animate-pulse'
                  : props.wsStatus === 'open'
                    ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_12%,transparent)] text-[var(--color-mzk-reactor-white)]'
                    : props.wsStatus === 'preview'
                      ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_36%,transparent)] bg-black/55 text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_92%,white)]'
                      : 'border-[color-mix(in_srgb,var(--color-mzk-warning-flare)_40%,transparent)] bg-black/60 text-[color-mix(in_srgb,var(--color-mzk-warning-flare)_88%,white)]'
              }`}
              title={
                props.wsStatus === 'connecting'
                  ? 'Connecting to Kaiser Core'
                  : 'Cockpit uplink'
              }
            >
              {props.wsStatus === 'connecting'
                ? '···'
                : props.wsStatus === 'preview'
                  ? 'LOC'
                  : props.wsStatus === 'open'
                    ? 'LNK'
                    : props.wsStatus.slice(0, 4)}
            </span>
            <span
              className="max-w-[4.5rem] truncate rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-silver)_40%,transparent)] bg-black/55 px-1 py-0.5 font-mono text-[7px] text-[color-mix(in_srgb,var(--color-mzk-silver-bright)_85%,transparent)] sm:max-w-[5.5rem] sm:text-[8px]"
              title={props.sessionId ?? undefined}
            >
              {props.sessionId ? props.sessionId.slice(0, 6) : '—'}
            </span>
            <button
              type="button"
              onClick={props.toggleTts}
              className={`shrink-0 rounded-[2px] border px-1 py-0.5 font-mono text-[7px] uppercase tracking-[0.06em] sm:text-[8px] ${
                props.ttsOn
                  ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma-violet)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_12%,transparent)] text-[var(--color-mzk-reactor-white)]'
                  : 'border-[color-mix(in_srgb,var(--color-mzk-silver-dim)_45%,transparent)] bg-black/55 text-[color-mix(in_srgb,var(--color-mzk-silver)_82%,transparent)]'
              }`}
              title="Browser TTS"
            >
              {props.ttsOn ? 'TTS' : 'tts'}
            </button>
            <button
              type="button"
              onClick={props.onHudHelp}
              className="shrink-0 rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_32%,transparent)] bg-black/55 px-1 py-0.5 font-mono text-[7px] uppercase tracking-[0.06em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)] hover:bg-white/5 sm:text-[8px]"
              title="HUD map"
              aria-label="Open HUD map"
            >
              ?
            </button>
            <button
              type="button"
              title="Tactical console — pilot comms, move bus, hull advisories"
              className={`shrink-0 rounded-[2px] border px-1 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.1em] sm:text-[8px] ${
                diagnosticSurfaceActive ?
                  'border-[color-mix(in_srgb,var(--color-mzk-inferno-yellow)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-blood-energy)_24%,black)] text-[var(--color-mzk-skull-bone)]'
                : 'border-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_38%,transparent)] bg-black/70 text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)] hover:bg-black/90'
              }`}
              onClick={() => onDiagnosticSurfaceChange(!diagnosticSurfaceActive)}
            >
              ≡
            </button>
        </div>
      </div>

      {/* Zone B — command deck */}
      <div className={SIM_HULL_DECK_ANCHOR}>
        <HudDeckGrip
          title="Kaiser command — directive, execute, voice; tactical console via ≡ in the top strip"
          className={`${SIM_SKL_ANGULAR_PANEL} w-full max-w-[min(100%,min(340px,calc(100vw-5.1rem)))] px-1 pb-px pt-px sm:px-1.5`}
        >
          <div className="flex w-full min-w-0 flex-col gap-px">
            <CockpitWaveformStrip active={waveformActive} hot={waveformHot} />
            <p
              className="line-clamp-1 hyphens-auto break-words border-b border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_18%,transparent)] pb-px text-left font-mono text-[clamp(7px,1.65vw,9px)] font-medium leading-tight text-[color-mix(in_srgb,var(--color-mzk-skull-bone)_94%,white)] sm:text-center sm:text-[clamp(8px,1.75vw,10px)]"
              style={{
                textShadow: '0 0 10px color-mix(in srgb, var(--color-mzk-blood-energy) 30%, transparent)',
              }}
              title={props.kaiserLine}
            >
              {props.kaiserLine}
            </p>
            <form className="w-full min-w-0" onSubmit={props.onCommandSubmit}>
              <HudSegmentRail className="w-full flex-col gap-px sm:flex-row sm:flex-nowrap">
                <div className="flex min-h-8 min-w-0 w-full flex-1 items-center bg-[color-mix(in_srgb,black_58%,transparent)] px-1.5 py-px pointer-coarse:min-h-10 sm:min-h-7 sm:px-2">
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
                    className="min-h-[26px] min-w-0 flex-1 border-0 bg-transparent py-0.5 font-[family-name:var(--font-body)] text-[clamp(10px,2.3vw,12px)] text-[var(--color-mzk-skull-bone)] outline-none placeholder:text-white/40 focus-visible:ring-0"
                  />
                </div>
                <div className="flex min-h-8 w-full min-w-0 shrink-0 divide-x divide-black/70 border-t border-black/70 pointer-coarse:min-h-10 sm:min-h-7 sm:w-auto sm:border-t-0 sm:divide-x-0">
                  <div className="flex min-h-8 min-w-0 flex-1 items-stretch pointer-coarse:min-h-10 sm:min-h-7 sm:flex-initial sm:border-l sm:border-black/70">
                    <CockpitPrimaryActuator
                      type="submit"
                      aria-label="Execute directive"
                      className="!h-auto w-full !min-h-8 !rounded-none !border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_45%,transparent)] !bg-[color-mix(in_srgb,var(--color-mzk-blood-energy)_18%,black)] !px-2 !py-0.5 !text-[8px] !tracking-[0.1em] text-[var(--color-mzk-skull-bone)] pointer-coarse:!min-h-10 sm:!min-h-7"
                    >
                      Exec
                    </CockpitPrimaryActuator>
                  </div>
                  <button
                    type="button"
                    title="Hold to capture speech"
                    className={`flex min-h-8 min-w-0 flex-1 items-center justify-center border-0 px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.07em] pointer-coarse:min-h-10 sm:min-h-7 ${labEase} ${
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
                    className="!flex min-h-8 min-w-0 flex-1 items-center justify-center !rounded-none border-0 !px-1.5 !py-0.5 !text-[8px] pointer-coarse:min-h-10 sm:!min-h-7"
                    onClick={() => props.voice.startMicTap()}
                  >
                    Mic
                  </LabPad>
                  <LabPad
                    disabled={!props.sessionId}
                    className="!flex min-h-8 min-w-0 flex-1 items-center justify-center !rounded-none border-0 !px-1.5 !py-0.5 !text-[8px] pointer-coarse:min-h-10 sm:!min-h-7"
                    onClick={() => void props.onVoiceNormalize()}
                  >
                    Voice
                  </LabPad>
                </div>
              </HudSegmentRail>
            </form>
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
            className="flex h-full min-h-0 min-w-0 w-[min(100vw-0.5rem,min(520px,100vw))] max-w-[100vw] flex-col border-l border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_38%,var(--color-mzk-smoke-panel)_22%)] bg-[color-mix(in_srgb,var(--color-mzk-gunmetal)_97%,black)] shadow-[-12px_0_48px_rgba(0,0,0,0.85)]"
            aria-label="Tactical console"
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_35%,transparent)] px-2 py-1.5">
                <div className="min-w-0">
                  <p className="truncate font-[family-name:var(--font-display)] text-[clamp(0.72rem,2vw,0.88rem)] font-semibold uppercase tracking-[0.1em] text-[var(--color-mzk-skull-bone)]">
                    Tactical console
                  </p>
                  <p className="truncate font-mono text-[8px] uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_55%,transparent)]">
                    Voice · move bus · hull advisories
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

              <div className="min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain px-2 pb-3 pt-2">
                <section id={`${deckTabId}-sec-pilot`} aria-label="Pilot voice and log" className="space-y-3">
                  <h3 className="border-b border-[color-mix(in_srgb,var(--color-mzk-plasma)_14%,transparent)] pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)]">
                    Pilot · voice & log
                  </h3>
                  <p className="font-mono text-[9px] leading-relaxed text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_78%,white)]">
                    Type directives in the <strong>command bar</strong> below the hull — this sheet keeps voice and the
                    live log together with moves and hull status.
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
                </section>

                <section id={`${deckTabId}-sec-combat`} aria-label="Combat move bus" className="space-y-3">
                  <h3 className="border-b border-[color-mix(in_srgb,var(--color-mzk-plasma)_14%,transparent)] pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)]">
                    Combat · move bus
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className="min-h-8 flex-1 rounded-md border border-white/15 bg-black/55 px-2 py-1.5 font-mono text-[clamp(10px,2.2vw,11px)] uppercase tracking-[0.05em] text-white/90 pointer-coarse:min-h-11"
                      title="Unified personality profile"
                    >
                      Personality · {props.personalityMode.replace(/_/g, ' ')}
                    </p>
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
                      disabled={false}
                      title="Cycles catalog moves — uses backend when linked, otherwise local synthetic plan."
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
                          disabled={false}
                          className="min-h-9 max-w-none truncate py-1.5 text-[9px] pointer-coarse:min-h-11"
                          onClick={() => props.onDemoMove(m)}
                        >
                          {m}
                        </LabPad>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-3">
                    <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_76%,white)]">
                      ML hull lab · synthetic artifacts
                    </p>
                    <p className="mb-2 font-mono text-[8px] leading-snug text-[color-mix(in_srgb,var(--color-mzk-silver)_82%,transparent)]">
                      Local-only move_batch (no uplink). Drives SKL mixer + resonance payloads like a stub policy.
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {SKL_ML_DEMO_PRESETS.map((p) => (
                        <LabPad
                          key={p.slug}
                          disabled={false}
                          title={p.voiceLine}
                          className="min-h-9 max-w-none truncate py-1.5 text-[9px] pointer-coarse:min-h-11"
                          onClick={() => props.onMlDemoMove(p.slug)}
                        >
                          {p.label}
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
                </section>

                <section id={`${deckTabId}-sec-hull`} aria-label="Hull advisories" className="space-y-2">
                  <h3 className="border-b border-[color-mix(in_srgb,var(--color-mzk-plasma)_14%,transparent)] pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)]">
                    Hull · advisories
                  </h3>
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
                </section>
              </div>
            </div>
          </aside>
        </div>
      : null}
    </div>
  )
}
