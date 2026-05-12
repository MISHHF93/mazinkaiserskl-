import type { CSSProperties, FormEvent } from 'react'
import { useEffect, useId, useMemo, useState } from 'react'
import type { AvatarPresentation } from '../../avatar/presentation'
import type { MoveVisualKind, SklMovePlaybackSnapshot } from '../../avatar/presentation/types'
import { ImageAvatarViewer } from '../../avatar/view/ImageAvatarViewer'
import { MoveDemonstrationOverlay } from '../../avatar/view/MoveDemonstrationOverlay'
import type { MazinkaiserCinematicScaleProfile, MechaHudState, PersonalityMode } from '../../types'
import type { VoiceConsoleSlice, VoicePushToTalkProps } from './CommandConsole'
import { cockpitExperienceLabel, deriveCockpitExperienceMode } from './cockpitExperienceMode'
import { HullInstrumentOverlay } from './HullInstrumentOverlay'

type CinematicCockpitProps = {
  wsStatus: string
  sessionId: string | null
  /** Official cinematic chassis profile (digital twin presentation scale). */
  cinematicScaleProfile: MazinkaiserCinematicScaleProfile
  ttsOn: boolean
  toggleTts: () => void

  hud: MechaHudState | null
  kaiserLine: string
  subtitleStreaming: boolean
  /** Browser TTS output active — drives waveform / hull pulse with subtitle stream */
  ttsSpeaking: boolean

  avatarPresentation: AvatarPresentation

  /** SKL hull clip playback vs backend `animation_plan` (graceful when GLB has 0 clips). */
  movePlayback: SklMovePlaybackSnapshot

  moveDemonstrationOverlay: {
    active: boolean
    title: string
    moveSlug?: string | null
    visualHint: MoveVisualKind
  }

  personalityMode: PersonalityMode
  onPersonalityModeChange: (m: PersonalityMode) => void
  strictWake: boolean
  onStrictWakeChange: (v: boolean) => void

  onRunDiagnostics: () => void

  tacticalSnippet: string
  tacticalLoading: boolean
  onLoadTactical: () => void
  onDemoMove: (move: string) => void
  /** Single control: cycle catalog moves and drive SKL via the same REST move-demo path as the bus. */
  onCycleHullAnimationTest: () => void
  /** Upcoming move label after the current cycle index (for button copy). */
  nextHullAnimationTestMove: string

  commandInput: string
  setCommandInput: (v: string) => void
  transcript: string
  assistantStream: string
  voice: VoiceConsoleSlice
  pushToTalkProps: VoicePushToTalkProps
  onCommandSubmit: (e: FormEvent) => void
  onVoiceNormalize: () => void
}

/** Hull-based cockpit — pilot workflow runs on the twin hull surface (SIMULATION). */
export function CinematicCockpit(props: CinematicCockpitProps) {
  const avatarListening = props.avatarPresentation.listening
  const h = props.hud
  const [controlsHelpOpen, setControlsHelpOpen] = useState(false)
  const [diagnosticSurfaceActive, setDiagnosticSurfaceActive] = useState(false)
  const controlsHelpTitleId = useId()

  const cockpitExperienceMode = useMemo(
    () =>
      deriveCockpitExperienceMode({
        presentation: props.avatarPresentation,
        movePlayback: props.movePlayback,
        diagnosticSurfaceActive,
      }),
    [props.avatarPresentation, props.movePlayback, diagnosticSurfaceActive],
  )

  useEffect(() => {
    if (!controlsHelpOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setControlsHelpOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [controlsHelpOpen])

  const infernoPulse =
    cockpitExperienceMode === 'MOVE_DEMO' || cockpitExperienceMode === 'FINAL_COUNT'
      ? 1
      : cockpitExperienceMode === 'COMBAT_READY'
        ? 0.55
        : cockpitExperienceMode === 'DIAGNOSTIC'
          ? 0.35
          : 0.22

  const cockpitVars = {
    '--mzk-photon-01': clamp01(h?.photon_power_pct ?? 74),
    '--mzk-heat-01': clamp01(h?.heat_level_pct ?? 12),
    '--mzk-sync-01': clamp01(h?.sync_rate_pct ?? 94),
    '--mzk-overdrive-01': clamp01(h?.overdrive_risk_pct ?? 0),
    '--mzk-nova-01': clamp01(h?.nova_readiness_pct ?? 0),
    '--mzk-inferno-rim': infernoPulse.toFixed(3),
    '--mzk-move-charge':
      props.avatarPresentation.semantic === 'MOVE_CHARGING' ||
      props.avatarPresentation.semantic === 'NOVA_PREP'
        ? 1
        : props.avatarPresentation.semantic === 'MOVE_EXECUTING'
          ? 0.72
          : 0,
  } as CSSProperties

  return (
    <div
      data-cockpit-experience={cockpitExperienceMode}
      className="relative flex h-full min-h-0 flex-col font-display-scope bg-[var(--color-mzk-black)] [--scan:5px]"
      style={cockpitVars}
    >
      <MoveDemonstrationOverlay
        active={props.moveDemonstrationOverlay.active}
        moveTitle={props.moveDemonstrationOverlay.title}
        visualHint={props.moveDemonstrationOverlay.visualHint}
        moveSlug={props.moveDemonstrationOverlay.moveSlug}
      />

      {/* Tactical grid + holographic field */}
      <div
        aria-hidden
        className="animate-mzk-grid-drift pointer-events-none fixed inset-0 z-0 opacity-[0.055]"
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in srgb,var(--color-mzk-plasma) 11%,transparent) 1px,transparent 1px),' +
            'linear-gradient(90deg,color-mix(in srgb,var(--color-mzk-plasma) 9%,transparent) 1px,transparent 1px),' +
            'radial-gradient(circle at 50% 42%,color-mix(in srgb,var(--color-mzk-photon-red) 5%,transparent),transparent 58%)',
          backgroundSize: '64px 64px, 64px 64px, 100% 100%',
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.22] mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent calc(var(--scan) - 1px), color-mix(in srgb,var(--color-mzk-plasma-ice) 14%, transparent) var(--scan))',
          maskImage: 'radial-gradient(ellipse 88% 74% at 50% 38%, black 32%, transparent 78%)',
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 animate-mzk-reactor-field opacity-[calc(0.22+var(--mzk-inferno-rim,0.22)*0.35)]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 90% 62% at 50% 118%, color-mix(in srgb, var(--color-mzk-photon-red) calc(18% + var(--mzk-photon-01) * 38% + var(--mzk-inferno-rim,0) * 24%), transparent), transparent 58%)',
          mixBlendMode: 'screen',
        }}
      />

      <div aria-hidden className="pointer-events-none fixed left-1/2 top-[-20%] z-0 h-[38vh] w-[120vw] -translate-x-1/2">
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[min(72vw,720px)] w-[min(72vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.16]"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'color-mix(in srgb, var(--color-mzk-plasma) 26%, transparent)',
            boxShadow: 'inset 0 0 120px color-mix(in srgb, var(--color-mzk-plasma-violet) 14%, transparent)',
          }}
        />
      </div>

      <div
        aria-hidden
        className="animate-mzk-tactical-scan pointer-events-none fixed left-0 top-0 z-0 h-[12vh] w-full bg-gradient-to-b from-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_12%,transparent)] to-transparent opacity-[0.34]"
      />

      <header className="pointer-events-none absolute left-0 right-0 top-0 z-[130] flex justify-center px-2 pt-[max(0.2rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex w-full max-w-[min(100%,56rem)] flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-b-md border border-t-0 border-[color-mix(in_srgb,var(--color-mzk-skull-bone)_22%,var(--color-mzk-plasma)_12%)] bg-[color-mix(in_srgb,var(--color-mzk-gunmetal)_72%,black)] px-2 py-1 shadow-[0_10px_40px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <div className="min-w-0 flex flex-1 items-center gap-x-2 gap-y-0.5">
            <p className="shrink-0 font-mono text-[7px] uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_82%,var(--color-mzk-blood-energy)_12%)] sm:text-[8px]">
              SKL
            </p>
            <span
              className={`shrink-0 rounded-[2px] border px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.1em] sm:text-[8px] ${
                cockpitExperienceMode === 'MOVE_DEMO' || cockpitExperienceMode === 'FINAL_COUNT'
                  ? 'border-[color-mix(in_srgb,var(--color-mzk-blood-energy)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-blood-energy)_18%,black)] text-[var(--color-mzk-inferno-yellow)]'
                : cockpitExperienceMode === 'COMBAT_READY'
                  ? 'border-[color-mix(in_srgb,var(--color-mzk-inferno-yellow)_45%,transparent)] bg-black/70 text-[color-mix(in_srgb,var(--color-mzk-skull-bone)_92%,white)]'
                : cockpitExperienceMode === 'DIAGNOSTIC'
                  ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_40%,transparent)] bg-black/75 text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)]'
                : 'border-[color-mix(in_srgb,var(--color-mzk-smoke-panel)_42%,transparent)] bg-black/65 text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_92%,transparent)]'
              }`}
              title="Cockpit experience mode"
            >
              {cockpitExperienceLabel(cockpitExperienceMode)}
            </span>
            <h1 className="min-w-0 truncate font-[family-name:var(--font-display)] text-[clamp(0.68rem,2.2vw,1rem)] font-extrabold tracking-tight text-[var(--color-mzk-skull-bone)] [text-shadow:0_0_12px_color-mix(in_srgb,var(--color-mzk-blood-energy)_22%,transparent),0_0_2px_black]">
              Kaiser Core
            </h1>
          </div>

          <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1 text-[clamp(8px,2.1vw,10px)]">
            <button
              type="button"
              onClick={() => setControlsHelpOpen(true)}
              className="rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_38%,transparent)] bg-black/55 px-1.5 py-0.5 font-mono uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_90%,white)] hover:bg-[color-mix(in_srgb,var(--color-mzk-plasma)_14%,black)] sm:px-2 sm:py-1"
              title="HUD map"
              aria-label="Open HUD map"
            >
              Help
            </button>
            <span
              className={`rounded-[2px] border px-1.5 py-0.5 font-mono uppercase tracking-[0.1em] sm:px-2 sm:py-1 ${
                props.wsStatus === 'open'
                  ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_14%,transparent)] text-[var(--color-mzk-reactor-white)]'
                  : props.wsStatus === 'preview'
                    ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_95%,white)]'
                  : 'border-[color-mix(in_srgb,var(--color-mzk-warning-flare)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-warning-orange)_16%,transparent)] text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_95%,var(--color-mzk-warning-flare))]'
              }`}
            >
              {props.wsStatus === 'preview' ? 'LOCAL' : props.wsStatus === 'open' ? 'LINK' : props.wsStatus}
            </span>
            <span
              className="hidden max-w-[5.5rem] truncate rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-silver)_45%,transparent)] bg-black/60 px-1.5 py-0.5 font-mono text-[color-mix(in_srgb,var(--color-mzk-silver-bright)_88%,transparent)] sm:inline sm:max-w-[7rem] sm:px-2 sm:py-1"
              title={props.sessionId ?? undefined}
            >
              {props.sessionId ? props.sessionId.slice(0, 8) : '—'}
            </span>
            <button
              type="button"
              onClick={props.toggleTts}
              className={`rounded-[2px] border px-1.5 py-0.5 font-mono uppercase tracking-[0.08em] sm:px-2 sm:py-1 ${
                props.ttsOn
                  ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma-violet)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_14%,transparent)] text-[var(--color-mzk-reactor-white)] hover:bg-[color-mix(in_srgb,var(--color-mzk-plasma)_26%,transparent)]'
                  : 'border-[color-mix(in_srgb,var(--color-mzk-silver-dim)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black-plate)_90%,transparent)] text-[color-mix(in_srgb,var(--color-mzk-silver)_88%,transparent)] hover:text-[var(--color-mzk-reactor-white)]'
              }`}
            >
              TTS {props.ttsOn ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </header>

      {controlsHelpOpen ?
        <div
          role="dialog"
          aria-modal
          aria-labelledby={controlsHelpTitleId}
          className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-[min(12rem,18vh)] sm:pt-[min(10rem,14vh)]"
        >
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-black/70 backdrop-blur-[1px]"
            onClick={() => setControlsHelpOpen(false)}
          />
          <div className="relative z-[1] w-full max-w-md rounded-2xl border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black-plate)_96%,black)] p-4 font-mono text-[clamp(10px,2.5vw,12px)] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_94%,white)] shadow-[0_16px_48px_rgba(0,0,0,0.85)] ring-1 ring-black/60">
            <h2
              id={controlsHelpTitleId}
              className="border-b border-white/15 pb-2 font-[family-name:var(--font-display)] text-[clamp(0.95rem,3vw,1.15rem)] font-semibold text-[var(--color-mzk-reactor-white)]"
            >
              HUD map
            </h2>
            <ul className="mt-3 list-inside list-disc space-y-2 leading-relaxed text-white/88">
              <li>
                <strong className="text-[var(--color-mzk-reactor-white)]">Top bar</strong> floats over the hull — uplink, session id, TTS. It does not shrink the 3D stage.
              </li>
              <li>
                <strong className="text-[var(--color-mzk-reactor-white)]">Kaiser command</strong> — bottom-left deck
                (directive + Execute). Open <strong>Console</strong> (status strip or deck) for voice log, combat bus,
                and hull advisories.
              </li>
              <li>
                <strong className="text-[var(--color-mzk-reactor-white)]">3D hull</strong> — camera preset dropdown and
                fullscreen on the viewport dock; Fit and gear bottom-right. <strong>Inspector</strong> is a floating chip
                over the mesh (does not steal canvas height).
              </li>
              <li>
                <strong className="text-[var(--color-mzk-reactor-white)]">Vitals</strong> — PH / SY / TH / AR stay in the
                compact top-right strip on the hull.
              </li>
            </ul>
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-[color-mix(in_srgb,var(--color-mzk-plasma)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_14%,black)] px-3 py-2 text-[clamp(10px,2.4vw,11px)] font-semibold uppercase tracking-[0.14em] text-[var(--color-mzk-reactor-white)] hover:bg-[color-mix(in_srgb,var(--color-mzk-plasma)_24%,black)] pointer-coarse:min-h-11"
              onClick={() => setControlsHelpOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      : null}

      <main
        aria-label="Hull-based twin workspace"
        className="relative z-[1] mx-auto flex h-full min-h-0 w-full max-w-[min(2560px,100%)] flex-1 flex-col px-0 pb-0 pt-0"
      >
        <ImageAvatarViewer
          hullSurface
          presentation={props.avatarPresentation}
          movePlayback={props.movePlayback}
          cockpitExperienceMode={cockpitExperienceMode}
          hudOverlay={
            <HullInstrumentOverlay
              cockpitExperienceMode={cockpitExperienceMode}
              diagnosticSurfaceActive={diagnosticSurfaceActive}
              onDiagnosticSurfaceChange={setDiagnosticSurfaceActive}
              twinStateLabel={props.avatarPresentation.stateLabel}
              ttsSpeaking={props.ttsSpeaking}
              hud={props.hud}
              kaiserLine={props.kaiserLine}
              subtitleStreaming={props.subtitleStreaming}
              personalityMode={props.personalityMode}
              strictWake={props.strictWake}
              onPersonalityModeChange={props.onPersonalityModeChange}
              onStrictWakeChange={props.onStrictWakeChange}
              onRunDiagnostics={props.onRunDiagnostics}
              tacticalSnippet={props.tacticalSnippet}
              tacticalLoading={props.tacticalLoading}
              onLoadTactical={props.onLoadTactical}
              onDemoMove={props.onDemoMove}
              onCycleHullAnimationTest={props.onCycleHullAnimationTest}
              nextHullAnimationTestMove={props.nextHullAnimationTestMove}
              sessionId={props.sessionId}
              commandInput={props.commandInput}
              setCommandInput={props.setCommandInput}
              transcript={props.transcript}
              assistantStream={props.assistantStream}
              voice={props.voice}
              pushToTalkProps={props.pushToTalkProps}
              onCommandSubmit={props.onCommandSubmit}
              onVoiceNormalize={props.onVoiceNormalize}
              avatarListening={avatarListening}
            />
          }
        />
      </main>

      {props.wsStatus === 'connecting' ? (
        <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[50] max-w-[min(420px,calc(100vw-2rem))] rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black)_92%,black)] px-3 py-2.5 font-mono text-[clamp(9px,2.6vw,11px)] uppercase leading-snug tracking-[0.2em] text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_95%,var(--color-mzk-plasma-ice))] shadow-[0_0_32px_color-mix(in_srgb,var(--color-mzk-plasma)_22%,transparent)] backdrop-blur-md sm:tracking-[0.24em]">
          Connecting to Kaiser Core…
        </div>
      ) : null}
    </div>
  )
}

function clamp01(n: number): string {
  return (Math.min(100, Math.max(0, n)) / 100).toFixed(4)
}
