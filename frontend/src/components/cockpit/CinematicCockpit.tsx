import type { CSSProperties, FormEvent } from 'react'
import { useEffect, useId, useMemo, useState } from 'react'
import type { AvatarPresentation } from '../../avatar/presentation'
import type { MoveVisualKind, SklMovePlaybackSnapshot } from '../../avatar/presentation/types'
import { ImageAvatarViewer } from '../../avatar/view/ImageAvatarViewer'
import { MoveDemonstrationOverlay } from '../../avatar/view/MoveDemonstrationOverlay'
import type { MazinkaiserCinematicScaleProfile, MechaHudState, PersonalityMode } from '../../types'
import type { VoiceConsoleSlice, VoicePushToTalkProps } from './CommandConsole'
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
  onMlDemoMove: (slug: string) => void
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

  const cockpitVisual = useMemo(() => {
    const ph = props.movePlayback.phase
    const moveHot = ph === 'charging' || ph === 'executing' || ph === 'cooldown'
    const combat = props.avatarPresentation.semantic === 'COMBAT_READY'
    const diag = diagnosticSurfaceActive || props.avatarPresentation.semantic === 'DIAGNOSTIC'
    const infernoPulse = moveHot ? 1 : combat ? 0.55 : diag ? 0.35 : 0.22
    return { infernoPulse, moveHot, combat, diag }
  }, [props.movePlayback.phase, props.avatarPresentation.semantic, diagnosticSurfaceActive])

  const infernoPulse = cockpitVisual.infernoPulse

  useEffect(() => {
    if (!controlsHelpOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setControlsHelpOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [controlsHelpOpen])

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
      data-cockpit-experience="UNIFIED"
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
        className="animate-mzk-tactical-scan pointer-events-none fixed left-0 top-0 z-0 h-[10vh] w-full bg-gradient-to-b from-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_10%,transparent)] to-transparent opacity-[0.28]"
      />

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
                <strong className="text-[var(--color-mzk-reactor-white)]">Unified HUD strip</strong> (top of the hull)
                — compact vitals, uplink (shows <strong>···</strong> while connecting), session id, TTS, <strong>?</strong>{' '}
                help, and <strong>≡</strong> tactical console in one flat row (scrolls horizontally on very narrow
                viewports).
              </li>
              <li>
                <strong className="text-[var(--color-mzk-reactor-white)]">Kaiser command</strong> — bottom-left deck:
                optional waveform, Kaiser line, then one segmented row: directive, <strong>Exec</strong>, PTT, Mic,
                Voice. Open the full tactical sheet with <strong>≡</strong> in the top strip only.
              </li>
              <li>
                <strong className="text-[var(--color-mzk-reactor-white)]">3D hull</strong> — camera preset dropdown and
                fullscreen on the viewport dock; Fit and gear bottom-right. <strong>Inspector</strong> is a floating chip
                over the mesh (does not steal canvas height).
              </li>
              <li>
                <strong className="text-[var(--color-mzk-reactor-white)]">Vitals</strong> — PH / SY / TH / AR are the
                four compact meters on the left side of the same top strip as the status chips.
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
          diagnosticSurfaceActive={diagnosticSurfaceActive}
          hudOverlay={
            <HullInstrumentOverlay
              wsStatus={props.wsStatus}
              ttsOn={props.ttsOn}
              toggleTts={props.toggleTts}
              onHudHelp={() => setControlsHelpOpen(true)}
              diagnosticSurfaceActive={diagnosticSurfaceActive}
              onDiagnosticSurfaceChange={setDiagnosticSurfaceActive}
              twinStateLabel={props.avatarPresentation.stateLabel}
              ttsSpeaking={props.ttsSpeaking}
              hud={props.hud}
              kaiserLine={props.kaiserLine}
              subtitleStreaming={props.subtitleStreaming}
              personalityMode={props.personalityMode}
              strictWake={props.strictWake}
              onStrictWakeChange={props.onStrictWakeChange}
              onRunDiagnostics={props.onRunDiagnostics}
              tacticalSnippet={props.tacticalSnippet}
              tacticalLoading={props.tacticalLoading}
              onLoadTactical={props.onLoadTactical}
              onDemoMove={props.onDemoMove}
              onMlDemoMove={props.onMlDemoMove}
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
    </div>
  )
}

function clamp01(n: number): string {
  return (Math.min(100, Math.max(0, n)) / 100).toFixed(4)
}
