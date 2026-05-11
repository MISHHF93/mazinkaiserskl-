import type { FormEvent } from 'react'
import type { MechaHudState, PersonalityMode } from '../../types'
import { KAISER_MOVES, PERSONALITY_MODES } from '../../types'
import type { VoiceConsoleSlice, VoicePushToTalkProps } from './CommandConsole'
import { CockpitPad, CockpitPrimaryActuator, LabPad } from './cockpitControls'
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
      className="rounded border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_35%,transparent)] bg-black/78 px-[clamp(6px,1.4vw,10px)] py-[clamp(4px,0.8vw,8px)] font-mono text-[clamp(9px,2.2vw,11px)] uppercase tracking-[0.06em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_92%,white)] shadow-[0_2px_12px_rgba(0,0,0,0.65)] backdrop-blur-md"
    >
      <span className="text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">{k}</span>{' '}
      <span className="text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_92%,white)]">{v}</span>
    </span>
  )
}

function MicroBar({ label, pct }: { label: string; pct: number }) {
  const p = Math.min(100, Math.max(0, pct))
  return (
    <div className="min-w-[min(72px,28vw)] flex-1">
      <div className="flex justify-between font-mono text-[clamp(9px,2.2vw,11px)] uppercase tracking-[0.05em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_92%,white)]">
        <span className="truncate">{label}</span>
        <span className="tabular-nums">{p.toFixed(0)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-black/85 ring-2 ring-[color-mix(in_srgb,var(--color-mzk-plasma)_28%,black)]">
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
export function HullInstrumentOverlay(props: HullInstrumentOverlayProps) {
  const d = props.hud
  const labEase = '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)] duration-[var(--duration-mzk-short)]'

  return (
    <div role="region" aria-label="Hull lab deck" className="pointer-events-none flex h-full min-h-0 flex-col">
      <div className="pointer-events-none flex min-h-0 flex-1 flex-col items-end pt-[clamp(2px,1vw,8px)] pr-[clamp(2px,1vw,12px)]">
        <div className="pointer-events-auto flex max-w-[min(96%,min(36rem,88vw))] flex-wrap justify-end gap-[clamp(0.15rem,0.7vw,0.35rem)] 2xl:max-w-[min(42rem,40vw)]">
          <MiniChip k="Twin" title={props.twinStateLabel} v={props.twinStateLabel.length > 22 ? `${props.twinStateLabel.slice(0, 22)}…` : props.twinStateLabel} />
          <MiniChip k="Alert" v={(d?.tactical_alert ?? '—').slice(0, 24)} />
          <MicroBar label="PH" pct={d?.photon_power_pct ?? 0} />
          <MicroBar label="SY" pct={d?.sync_rate_pct ?? 0} />
          <MicroBar label="TH" pct={d?.heat_level_pct ?? 0} />
          <MicroBar label="AR" pct={d?.armor_integrity_pct ?? 0} />
        </div>
      </div>

      <div className="pointer-events-auto mx-auto mt-auto w-[min(100%,56rem)] max-h-[min(52dvh,480px)] shrink-0 overflow-y-auto overscroll-contain rounded-t-xl border border-b-0 border-white/28 bg-[color-mix(in_srgb,#070910_94%,black)] px-[clamp(0.45rem,2.2vw,0.95rem)] pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] pt-[clamp(0.45rem,1.4vw,0.75rem)] shadow-[0_-16px_56px_rgba(0,0,0,0.78)] backdrop-blur-md min-[1600px]:max-h-[min(42vh,580px)] min-[1600px]:max-w-[min(920px,46vw)] 2xl:rounded-t-2xl">
        <p
          className="border-b border-white/12 pb-1.5 text-center font-[family-name:var(--font-display)] text-[clamp(0.78rem,3.2vw,1.05rem)] font-semibold leading-snug text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_98%,white)]"
          style={{
            textShadow:
              '0 0 1px rgba(0,0,0,1), 0 0 14px color-mix(in srgb, var(--color-mzk-plasma-violet) 28%, transparent)',
          }}
        >
          {props.kaiserLine}
        </p>
        <p className="text-center font-mono text-[clamp(9px,2.2vw,11px)] uppercase tracking-[0.22em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_82%,white)]">
          {props.subtitleStreaming ? 'Hull manifold · stream lock' : 'Hull manifold · idle carrier'}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-2">
          <label htmlFor="hull-lab-mode" className="sr-only">
            Personality mode
          </label>
          <select
            id="hull-lab-mode"
            value={props.personalityMode}
            onChange={(e) => props.onPersonalityModeChange(e.target.value as PersonalityMode)}
            className="max-w-[min(240px,88vw)] min-h-[44px] cursor-pointer rounded-lg border-2 border-white/28 bg-neutral-950 px-3 py-2 font-mono text-[clamp(11px,2.8vw,13px)] uppercase tracking-[0.05em] text-white outline-none ring-offset-2 ring-offset-[#070910] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-mzk-plasma)_50%,white)] sm:min-h-[40px] sm:max-w-[min(220px,50vw)] sm:py-2"
          >
            {PERSONALITY_MODES.map((m) => (
              <option key={m} value={m}>
                {m.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border-2 border-white/22 bg-black/70 px-3 py-2 font-mono text-[clamp(11px,2.6vw,12px)] uppercase tracking-[0.05em] text-white/90 sm:min-h-[40px] sm:py-2">
            <input
              type="checkbox"
              checked={props.strictWake}
              onChange={(e) => props.onStrictWakeChange(e.target.checked)}
              className="h-3 w-3 accent-[var(--color-mzk-gold-core)]"
            />
            Wake gate
          </label>
          <CockpitPad tone="plasma" disabled={!props.sessionId} onClick={props.onRunDiagnostics} className="min-h-[40px] py-2 text-[clamp(10px,2.5vw,12px)] sm:min-h-0 sm:py-1.5">
            Diagnose
          </CockpitPad>
          <CockpitPad
            tone="plasma"
            disabled={props.tacticalLoading}
            onClick={props.onLoadTactical}
            className="min-h-[40px] py-2 text-[clamp(10px,2.5vw,12px)] sm:min-h-0 sm:py-1.5"
          >
            {props.tacticalLoading ? 'Env…' : 'Tactical'}
          </CockpitPad>
        </div>

        <form className="mt-1.5 flex flex-wrap gap-1 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-2" onSubmit={props.onCommandSubmit}>
          <textarea
            id="hull-lab-cmd"
            rows={2}
            placeholder="Directive…"
            value={props.commandInput}
            onChange={(e) => props.setCommandInput(e.target.value)}
            className="min-h-[2.75rem] min-w-0 flex-[1_1_min(100%,180px)] resize-none rounded-lg border-2 border-white/22 bg-neutral-950/95 px-[clamp(0.35rem,1.5vw,0.55rem)] py-[clamp(0.35rem,1.2vw,0.45rem)] font-[family-name:var(--font-body)] text-[clamp(11px,2.8vw,14px)] text-[var(--color-mzk-reactor-white)] outline-none placeholder:text-white/45 ring-offset-2 ring-offset-[#070910] focus-visible:border-[color-mix(in_srgb,var(--color-mzk-plasma)_45%,white)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-mzk-plasma)_40%,transparent)] sm:flex-[1_1_260px]"
          />
          <CockpitPrimaryActuator type="submit" className="min-h-[44px] shrink-0 px-[clamp(0.75rem,3vw,1.25rem)] py-[clamp(0.45rem,1.8vw,0.65rem)] text-[clamp(9px,2.6vw,12px)] sm:min-h-0">
            Execute
          </CockpitPrimaryActuator>
        </form>

        <div className="mt-1.5 flex flex-wrap gap-1 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-2">
          <button
            type="button"
            title="Hold to capture speech"
            className={`min-h-[44px] rounded-lg border-2 px-[clamp(0.5rem,2vw,0.85rem)] py-[clamp(0.35rem,1.4vw,0.45rem)] font-mono text-[clamp(10px,2.6vw,12px)] font-semibold uppercase tracking-[0.07em] sm:min-h-0 ${labEase} ${
              props.avatarListening ?
                'border-[color-mix(in_srgb,var(--color-mzk-gold)_48%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-warning-orange)_22%,black)] text-[var(--color-mzk-reactor-white)]'
              : 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_22%,transparent)] bg-black/60 text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_96%,var(--color-mzk-plasma-ice))]'
            } ${props.voice.supportsStt ? '' : 'cursor-not-allowed opacity-55'} `}
            disabled={!props.voice.supportsStt}
            {...props.pushToTalkProps}
          >
            PTT
          </button>
          <LabPad disabled={!props.voice.supportsStt} className="min-h-[40px] text-[clamp(10px,2.5vw,11px)] sm:min-h-0" onClick={() => props.voice.startMicTap()}>
            Mic tap
          </LabPad>
          <LabPad disabled={!props.sessionId} className="min-h-[40px] text-[clamp(10px,2.5vw,11px)] sm:min-h-0" onClick={() => void props.onVoiceNormalize()}>
            Voice cmd
          </LabPad>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-[clamp(0.25rem,1vw,0.35rem)] border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-2 min-[520px]:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <span className="col-span-full font-mono text-[clamp(9px,2.2vw,11px)] uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_88%,white)]">
            Sequence bus (demo)
          </span>
          {KAISER_MOVES.map((m) => (
            <LabPad key={m} disabled={!props.sessionId} className="min-h-[40px] max-w-none truncate py-2 text-[clamp(10px,2.4vw,11px)] sm:min-h-0 sm:max-w-[140px] sm:py-1.5" onClick={() => props.onDemoMove(m)}>
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

        <details className="group mt-2 rounded-md border border-[color-mix(in_srgb,var(--color-mzk-plasma)_12%,transparent)] bg-black/35 px-2 py-1.5">
          <summary className="cursor-pointer list-none font-mono text-[8px] uppercase tracking-[0.22em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_72%,transparent)] marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="text-[color-mix(in_srgb,var(--color-mzk-gold-core)_75%,transparent)] group-open:rotate-90 inline-block transition-transform">
              ▸
            </span>{' '}
            Lab readouts & voice log
          </summary>
          <div className="mt-2 grid gap-2 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] pt-2 font-mono text-[9px] text-[color-mix(in_srgb,var(--color-mzk-silver)_88%,transparent)] sm:grid-cols-2">
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
            {props.voice.liveTranscript ?
              <p className="sm:col-span-2 text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)]">
                <span className="uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
                  Live STT ·{' '}
                </span>
                {props.voice.liveTranscript}
              </p>
            : null}
            {props.assistantStream.trim() ?
              <p className="sm:col-span-2 text-[color-mix(in_srgb,var(--color-mzk-plasma)_90%,white)]">
                <span className="uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">
                  Stream ·{' '}
                </span>
                {props.assistantStream}
              </p>
            : props.transcript ?
              <p className="sm:col-span-2">{props.transcript}</p>
            : null}
          </div>
        </details>
      </div>
    </div>
  )
}
