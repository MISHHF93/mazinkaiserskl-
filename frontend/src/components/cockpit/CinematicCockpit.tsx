import type { CSSProperties } from 'react'
import type { FormEvent } from 'react'
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

  const cockpitVars = {
    '--mzk-photon-01': clamp01(h?.photon_power_pct ?? 74),
    '--mzk-heat-01': clamp01(h?.heat_level_pct ?? 12),
    '--mzk-sync-01': clamp01(h?.sync_rate_pct ?? 94),
    '--mzk-overdrive-01': clamp01(h?.overdrive_risk_pct ?? 0),
    '--mzk-nova-01': clamp01(h?.nova_readiness_pct ?? 0),
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
        className="pointer-events-none fixed inset-0 z-0 animate-mzk-reactor-field opacity-[0.3]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 90% 62% at 50% 118%, color-mix(in srgb, var(--color-mzk-photon-red) calc(18% + var(--mzk-photon-01) * 38%), transparent), transparent 58%)',
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

      <header className="relative z-[1] border-b border-[color-mix(in_srgb,var(--color-mzk-silver-dim)_38%,var(--color-mzk-plasma)_18%)] bg-[color-mix(in_srgb,var(--color-mzk-black-plate)_94%,black)] px-[clamp(0.5rem,2.5vw,1.25rem)] py-[clamp(0.4rem,1.2vw,0.65rem)] shadow-[inset_0_-1px_0_color-mix(in_srgb,var(--color-mzk-plasma)_12%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[min(2560px,calc(100%-0.5rem))] flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1 basis-[min(100%,280px)]">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:gap-3">
              <p className="font-mono text-[clamp(7px,2.2vw,10px)] uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--color-mzk-silver-bright)_92%,var(--color-mzk-plasma))] sm:tracking-[0.42em] md:tracking-[0.5em]">
                MAZINKAISER · VIEWPORT IMMERSION
              </p>
              <span className="hidden h-3 w-px bg-[color-mix(in_srgb,var(--color-mzk-silver)_40%,transparent)] md:inline" />
              <span className="hidden font-mono text-[clamp(8px,2vw,9px)] tracking-[0.18em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_94%,var(--color-mzk-photon-red))] md:inline lg:tracking-[0.22em]">
                SUPER ROBOT BRIDGE · LINK PRIME
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-display)] mt-0.5 max-w-[min(100%,42rem)] truncate text-[clamp(1.05rem,3.5vw,2.25rem)] font-extrabold tracking-tight text-[var(--color-mzk-reactor-white)] [text-shadow:0_0_20px_color-mix(in_srgb,var(--color-mzk-plasma-ice)_38%,transparent),0_0_4px_black]">
              Kaiser Core Intelligence
            </h1>
            <p className="mt-1 hidden max-w-[min(56rem,92vw)] font-mono text-[clamp(7px,1.8vw,9px)] uppercase leading-snug tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_88%,var(--color-mzk-gold)_12%)] sm:block sm:tracking-[0.16em] md:tracking-[0.18em]">
              Hull-native twin · {props.cinematicScaleProfile.height_meters} M hull ·{' '}
              {props.cinematicScaleProfile.weight_metric_tons} t mass · Scrander{' '}
              {props.cinematicScaleProfile.scrander_wingspan_meters} M · Blade{' '}
              {props.cinematicScaleProfile.kaiser_blade_length_meters} M · Cockpit{' '}
              {props.cinematicScaleProfile.cockpit_length_meters} M
            </p>
          </div>

          <div className="flex max-w-full flex-shrink-0 flex-wrap items-center justify-end gap-[clamp(0.35rem,1.5vw,0.6rem)] text-[clamp(9px,2.4vw,11px)]">
            <span
              className={`rounded-[2px] border px-2 py-1 font-mono uppercase tracking-[0.1em] sm:px-2.5 sm:py-1.5 sm:tracking-[0.12em] ${
                props.wsStatus === 'open'
                  ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_14%,transparent)] text-[var(--color-mzk-reactor-white)]'
                  : props.wsStatus === 'preview'
                    ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_95%,white)]'
                  : 'border-[color-mix(in_srgb,var(--color-mzk-warning-flare)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-warning-orange)_16%,transparent)] text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_95%,var(--color-mzk-warning-flare))]'
              }`}
            >
              UPLINK ·{' '}
              {props.wsStatus === 'preview' ?
                'local'
              : props.wsStatus}
            </span>
            <span className="rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-silver)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black)_88%,transparent)] px-2 py-1 font-mono text-[color-mix(in_srgb,var(--color-mzk-silver-bright)_88%,transparent)] sm:px-2.5 sm:py-1.5">
              SESSION {props.sessionId ? `${props.sessionId.slice(0, 8)}…` : '—'}
            </span>
            <button
              type="button"
              onClick={props.toggleTts}
              className={`rounded-[2px] border px-2 py-1 font-mono uppercase tracking-[0.08em] sm:px-2.5 sm:py-1.5 sm:tracking-[0.1em] md:tracking-[0.12em] ${
                props.ttsOn
                  ? 'border-[color-mix(in_srgb,var(--color-mzk-plasma-violet)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_14%,transparent)] text-[var(--color-mzk-reactor-white)] hover:bg-[color-mix(in_srgb,var(--color-mzk-plasma)_26%,transparent)]'
                  : 'border-[color-mix(in_srgb,var(--color-mzk-silver-dim)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black-plate)_90%,transparent)] text-[color-mix(in_srgb,var(--color-mzk-silver)_88%,transparent)] hover:text-[var(--color-mzk-reactor-white)]'
              }`}
            >
              VOCAL AI {props.ttsOn ? 'ARMED' : 'MUTE'}
            </button>
          </div>
        </div>
      </header>

      <main
        aria-label="Hull-based twin workspace"
        className="relative z-[1] mx-auto flex min-h-0 w-full max-w-[min(2560px,100%)] flex-1 flex-col px-[clamp(3px,1.2vw,16px)] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-[clamp(2px,0.8vw,10px)] sm:pb-3 sm:pt-1 md:px-[clamp(6px,1.5vw,20px)]"
      >
        <ImageAvatarViewer
          hullSurface
          presentation={props.avatarPresentation}
          movePlayback={props.movePlayback}
          hudOverlay={
            <HullInstrumentOverlay
              twinStateLabel={props.avatarPresentation.stateLabel}
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
