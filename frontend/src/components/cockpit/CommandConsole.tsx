import type { FormEvent, HTMLAttributes } from 'react'
import { CockpitPad, CockpitPrimaryActuator } from './cockpitControls'
import { CockpitPanel } from './CockpitPanel'

export type VoiceConsoleSlice = {
  liveTranscript: string
  lastHeard: string
  supportsStt: boolean
  startMicTap: () => void
}

export type VoicePushToTalkProps = Pick<
  HTMLAttributes<HTMLElement>,
  'onPointerDown' | 'onPointerUp' | 'onPointerLeave' | 'onPointerCancel'
>

type CommandConsoleProps = {
  input: string
  setInput: (v: string) => void
  transcript: string
  assistantStream: string
  voice: VoiceConsoleSlice
  onSubmit: (e: FormEvent) => void
  onVoiceNormalize: () => void
  sessionId: string | null
  avatarListening: boolean
  pushToTalkProps: VoicePushToTalkProps
}

const HEAVY_EASE_BTN = '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]'

export function CommandConsole({
  input,
  setInput,
  transcript,
  assistantStream,
  voice,
  onSubmit,
  onVoiceNormalize,
  sessionId,
  avatarListening,
  pushToTalkProps,
}: CommandConsoleProps) {
  return (
    <>
      <CockpitPanel
        variant="hull"
        title="Directive console"
        subtitle="Text uplink · routed through hull twin queue"
        badge="CMD"
      >
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <textarea
            id="cockpit-cmd"
            rows={3}
            placeholder="Kaiser, report twin status… / simulation-only directives…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full resize-none rounded-xl border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_22%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black)_92%,transparent)] px-3 py-3 font-[family-name:var(--font-body)] text-sm text-[var(--color-mzk-reactor-white)] shadow-[inset_0_0_28px_color-mix(in_srgb,var(--color-mzk-plasma)_6%,transparent)] outline-none ring-[color-mix(in_srgb,var(--color-mzk-plasma)_42%,transparent)] transition-shadow duration-[var(--duration-mzk-panel)] focus:ring-2"
          />
          <div className="flex flex-wrap gap-2">
            <CockpitPrimaryActuator type="submit">Execute</CockpitPrimaryActuator>
          </div>
        </form>
      </CockpitPanel>

      <div className="h-4 shrink-0" />

      <CockpitPanel
        variant="hull"
        title="Voice lattice"
        subtitle="Hull ingest pads · push-to-talk router"
        badge="VOC"
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            title="Hold to capture speech"
            className={`select-none rounded-xl border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-[transform,box-shadow] duration-[var(--duration-mzk-short)] touch-none sm:min-w-[148px] ${
              avatarListening
                ? 'border-[color-mix(in_srgb,var(--color-mzk-gold)_52%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-warning-orange)_22%,black)] text-[var(--color-mzk-reactor-white)] shadow-[0_0_28px_color-mix(in_srgb,var(--color-mzk-gold)_26%,transparent)]'
                : 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_26%,transparent)] bg-[color-mix(in_srgb,black_82%,var(--color-mzk-plasma)_8%)] text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_98%,var(--color-mzk-plasma-ice))] hover:border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_40%,transparent)] hover:bg-[color-mix(in_srgb,black_74%,var(--color-mzk-plasma)_12%)]'
            } ${voice.supportsStt ? '' : 'cursor-not-allowed opacity-55'} ${HEAVY_EASE_BTN}`}
            disabled={!voice.supportsStt}
            {...pushToTalkProps}
          >
            Push‑to‑talk
          </button>
          <CockpitPad
            disabled={!voice.supportsStt}
            onClick={() => voice.startMicTap()}
            className="px-4 py-3 text-[11px] font-semibold tracking-[0.12em]"
          >
            Mic tap
          </CockpitPad>
          <CockpitPad
            disabled={!sessionId}
            onClick={() => void onVoiceNormalize()}
            className="border-[color-mix(in_srgb,var(--color-mzk-plasma-violet)_48%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-danger-purple)_22%,black)] px-4 py-3 text-[11px] font-semibold tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_95%,var(--color-mzk-plasma-violet))] hover:bg-[color-mix(in_srgb,var(--color-mzk-danger-purple)_34%,black)]"
          >
            Voice command
          </CockpitPad>
        </div>

        <details className="group mt-5 rounded-xl border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-black)_82%,transparent)] shadow-[inset_0_0_24px_color-mix(in_srgb,var(--color-mzk-plasma)_5%,transparent)]">
          <summary className="cursor-pointer list-none px-3 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_88%,transparent)] marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,transparent)] group-open:text-[var(--color-mzk-plasma-ice)]">
              ▸
            </span>{' '}
            Transcript telemetry
          </summary>
          <dl className="space-y-2 px-3 pb-3 pt-2 font-mono text-[11px] leading-relaxed text-[color-mix(in_srgb,var(--color-mzk-silver)_88%,transparent)]">
            {voice.liveTranscript ? (
              <Row label="Live STT" body={voice.liveTranscript} accent="text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_95%,white)]" />
            ) : null}
            {voice.lastHeard ? <Row label="Last capture" body={voice.lastHeard} accent="text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_90%,silver)]" /> : null}
            {assistantStream.trim() ? (
              <Row label="Assistant stream" body={assistantStream} accent="text-[color-mix(in_srgb,var(--color-mzk-plasma)_95%,white)]" mono />
            ) : transcript ? (
              <Row label="Operator note" body={transcript} accent="text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_88%,silver)]" />
            ) : (
              <p className="text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,transparent)]">Awaiting voice activity…</p>
            )}
          </dl>
        </details>
      </CockpitPanel>
    </>
  )
}

function Row({
  label,
  body,
  accent,
  mono,
}: {
  label: string
  body: string
  accent?: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className={`text-[10px] uppercase tracking-[0.25em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_78%,transparent)] ${mono ? 'font-mono' : ''}`}>
        {label}
      </dt>
      <dd
        className={`mt-1 ${accent ?? 'text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_82%,silver)]'} ${mono ? 'font-mono text-[10px] leading-relaxed' : ''}`}
      >
        {body}
      </dd>
    </div>
  )
}
