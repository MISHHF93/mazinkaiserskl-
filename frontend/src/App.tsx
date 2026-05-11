import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  normalizeAnimationPlan,
  resolveAvatarPresentation,
  resolveMoveVisualKind,
  severitiesFromAnimationPlan,
} from './avatar/presentation'
import type { AvatarRuntimeCues, MoveVisualKind, SklMovePlaybackSnapshot } from './avatar/presentation/types'
import { CinematicCockpit } from './components/cockpit/CinematicCockpit'
import { useCockpitWs, type MoveBatchWire } from './hooks/useCockpitWs'
import { useVoiceInteractionLayer } from './hooks/useVoiceInteractionLayer'
import * as api from './lib/api'
import { logOptionalApiFailure } from './lib/devLog'
import { cancelBrowserSpeech, speakWithBrowser, subscribeBrowserSpeakingPoll } from './speech/browserTts'
import { subscribeMazinkaiserVoicesReady } from './speech/kaiserVoice'
import type { MechaHudState, PersonalityMode } from './types'
import { normalizeWakeSnippet } from './voice/wakeArchitecture'

function matchesWakePrefix(text: string, prefixes: string[]): boolean {
  const t = text.trim().toLowerCase()
  if (prefixes.length === 0) return true
  return prefixes.some((p) => p.trim() && t.startsWith(p.trim().toLowerCase()))
}

function coerceMoveAnimationPlan(raw: unknown): Record<string, unknown>[] {
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []
}

function warnAcceptedEmptyAnimationPlan(outcome: string | undefined, planLen: number, ctx: string) {
  if (import.meta.env.DEV && outcome === 'accepted' && planLen === 0) {
    console.warn(
      `[cockpit] ${ctx}: move_batch accepted but animation_plan is empty — check MoveExecutionEngine / simulation.`,
    )
  }
}

type MoveLayerState = AvatarRuntimeCues['move']

const INITIAL_MOVE: MoveLayerState = {
  phase: 'idle',
  label: '',
  backendMoveId: null,
  visualHint: 'neutral',
  planSeverities: [],
  animationPlan: [],
  executingStartedAtMs: null,
}


export default function App() {
  const moveTimersRef = useRef<number[]>([])
  const clearMoveTimers = useCallback(() => {
    moveTimersRef.current.forEach(window.clearTimeout)
    moveTimersRef.current = []
  }, [])

  const [moveLayer, setMoveLayer] = useState<MoveLayerState>(INITIAL_MOVE)

  /** WS inbound batches consult fresh phase — avoids stale `{charging | executing}` closure skips/doubles. */
  const moveLayerRef = useRef(moveLayer)
  moveLayerRef.current = moveLayer

  const [hudRest, setHudRest] = useState<MechaHudState | null>(null)
  const [mode, setMode] = useState<PersonalityMode>('KAISER_CORE_MODE')
  const [input, setInput] = useState('')
  const [transcript, setTranscript] = useState('')
  const [ttsOn, setTtsOn] = useState(true)
  const [tactical, setTactical] = useState<string>('')
  const [tacticalLoading, setTacticalLoading] = useState(false)

  const [ttsSpeaking, setTtsSpeaking] = useState(false)
  const [micListening, setMicListening] = useState(false)
  const [diagnosticUntilMs, setDiagnosticUntilMs] = useState(0)
  const [avatarTick, setAvatarTick] = useState(0)

  const [wakePrefixes, setWakePrefixes] = useState<string[]>([
    'Kaiser,',
    'Kaiser:',
    'Hey Kaiser,',
  ])
  const [strictWake, setStrictWake] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('mazinkaiser.strictWake') === '1',
  )

  const onInboundMoveBatch = useCallback(
    (batch: MoveBatchWire) => {
      const phase = moveLayerRef.current.phase
      if (phase === 'charging' || phase === 'executing') return

      const slug = typeof batch.move_id === 'string' ? batch.move_id : null
      const planRaw = coerceMoveAnimationPlan(batch.animation_plan)
      warnAcceptedEmptyAnimationPlan(batch.outcome, planRaw.length, 'WebSocket move_event')
      const labelHint = slug?.replace(/-/g, ' ') || 'Remote move'
      clearMoveTimers()

      const hint = resolveMoveVisualKind({ backendMoveId: slug, label: labelHint })
      const normalizedPlan = normalizeAnimationPlan(planRaw)
      setMoveLayer({
        phase: 'executing',
        label: labelHint,
        backendMoveId: slug,
        visualHint: hint,
        planSeverities: severitiesFromAnimationPlan(planRaw),
        animationPlan: normalizedPlan,
        executingStartedAtMs: performance.now(),
      })

      if (typeof batch.voice_line === 'string') setTranscript(batch.voice_line)

      const schedule = (fn: () => void, ms: number) => {
        const id = window.setTimeout(fn, ms)
        moveTimersRef.current.push(id)
      }

      const refined = resolveMoveVisualKind({ backendMoveId: slug, label: labelHint })
      const execMs = batch.outcome === 'refused' ? 980 : refined === 'nova' ? 3200 : 2700
      schedule(() => {
        setMoveLayer((prev) => ({
          ...prev,
          phase: 'cooldown',
        }))
        schedule(() => {
          setMoveLayer({ ...INITIAL_MOVE })
        }, 420)
      }, execMs)
    },
    [clearMoveTimers],
  )

  const wsHandlers = useMemo(() => ({ onInboundMoveBatch }), [onInboundMoveBatch])

  const {
    status,
    sessionId,
    hud: streamHud,
    cinematicScaleProfile,
    ingestCinematicProfile,
    lastReply,
    assistantStream,
    assistDone,
    consumeAssistPlayback,
    sendChat,
  } = useCockpitWs(wsHandlers)

  const hud = streamHud ?? hudRest

  useEffect(() => {
    const id = window.setInterval(() => setAvatarTick((n) => n + 1), 640)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    void (async () => {
      try {
        const cfg = await api.fetchSessionConfig(sessionId)
        if (cancelled) return
        if (cfg.wake_prefixes?.length) setWakePrefixes(cfg.wake_prefixes)
      } catch (e) {
        logOptionalApiFailure('session config', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  useEffect(() => () => cancelBrowserSpeech(), [])

  useEffect(() => {
    const off = subscribeMazinkaiserVoicesReady(() => {})
    return off
  }, [])

  useEffect(() => {
    const off = subscribeBrowserSpeakingPoll(setTtsSpeaking)
    return off
  }, [])

  const dispatchPilotText = useCallback(
    (text: string, bypassWake = false) => {
      const trimmed = text.trim()
      if (!trimmed) return
      if (!bypassWake && strictWake && !matchesWakePrefix(trimmed, wakePrefixes)) {
        setTranscript('Wake phrase required. Lead with “Kaiser,” (or disable strict wake).')
        return
      }
      sendChat(trimmed, mode)
    },
    [strictWake, wakePrefixes, sendChat, mode],
  )

  const voice = useVoiceInteractionLayer({
    onUserFinalTranscript: (text) => {
      const raw = text.trim()
      setTranscript(raw)
      if (!raw) return
      if (strictWake && !matchesWakePrefix(raw, wakePrefixes)) {
        setTranscript('Wake phrase required. Lead with “Kaiser,” (or disable strict wake).')
        return
      }
      if (!sessionId) return
      void (async () => {
        try {
          const ing = await api.postVoiceIngest(sessionId, raw, false)
          const sent = ing.normalized_text.trim() ? ing.normalized_text : raw
          dispatchPilotText(sent, true)
          setTranscript(
            `[Voice] ${raw.slice(0, 96)}${raw.length > 96 ? '…' : ''} → Kaiser: ${sent.slice(0, 96)}${sent.length > 96 ? '…' : ''}`,
          )
        } catch (e) {
          logOptionalApiFailure('voice ingest (mic)', e)
          dispatchPilotText(raw)
          setTranscript('Voice ingest failed — sent raw transcript.')
        }
      })()
    },
    onActivityChange: (listening) => {
      setMicListening(listening)
    },
  })

  useEffect(() => {
    if (!assistDone) return
    const target = assistantStream.trim() || lastReply.trim()
    if (!ttsOn) {
      consumeAssistPlayback()
      return
    }
    if (!target) {
      consumeAssistPlayback()
      return
    }
    speakWithBrowser({
      text: target,
      profile: 'mazinkaiser',
      onEnd: () => consumeAssistPlayback(),
      onError: () => consumeAssistPlayback(),
    })
  }, [assistDone, assistantStream, lastReply, ttsOn, consumeAssistPlayback])

  const runDiagnosticsPass = useCallback(async () => {
    if (!sessionId) return
    try {
      const res = await api.postDiagnostics(sessionId)
      setHudRest(res.state)
      ingestCinematicProfile(res.cinematic_scale_profile)
      setDiagnosticUntilMs(performance.now() + 4800)
      dispatchPilotText('Report diagnostic summary for the pilot.', true)
    } catch (e) {
      logOptionalApiFailure('diagnostics', e)
    }
  }, [sessionId, dispatchPilotText, ingestCinematicProfile])

  const onPersonalityChange = useCallback(
    async (m: PersonalityMode) => {
      setMode(m)
      if (!sessionId) return
      try {
        const res = await api.postMode(sessionId, m)
        setHudRest(res.state)
        ingestCinematicProfile(res.cinematic_scale_profile)
      } catch (e) {
        logOptionalApiFailure('cockpit mode', e)
      }
    },
    [sessionId, ingestCinematicProfile],
  )

  const runMove = useCallback(
    (moveLabel: string) => {
      if (!sessionId) return
      clearMoveTimers()

      const hint = resolveMoveVisualKind({ label: moveLabel })
      setMoveLayer({
        phase: 'charging',
        label: moveLabel,
        backendMoveId: null,
        visualHint: hint,
        planSeverities: [],
        animationPlan: [],
        executingStartedAtMs: null,
      })

      const schedule = (fn: () => void, ms: number) => {
        const id = window.setTimeout(fn, ms)
        moveTimersRef.current.push(id)
      }

      schedule(() => {
        void (async () => {
          try {
            const res = await api.postMoveDemo(sessionId, moveLabel)
            setHudRest(res.state)
            ingestCinematicProfile(res.cinematic_scale_profile)

            const batch = res.move_batch as MoveBatchWire
            const slug = typeof batch.move_id === 'string' ? batch.move_id : null
            const planRaw = coerceMoveAnimationPlan(batch.animation_plan)
            warnAcceptedEmptyAnimationPlan(batch.outcome, planRaw.length, 'REST move-demo')
            const refined: MoveVisualKind = resolveMoveVisualKind({
              backendMoveId: slug,
              label: moveLabel,
            })
            const sev = severitiesFromAnimationPlan(planRaw)
            const normalizedPlan = normalizeAnimationPlan(planRaw)

            setMoveLayer({
              phase: 'executing',
              label: moveLabel,
              backendMoveId: slug,
              visualHint: refined,
              planSeverities: sev,
              animationPlan: normalizedPlan,
              executingStartedAtMs: performance.now(),
            })

            if (typeof batch.voice_line === 'string') setTranscript(batch.voice_line)

            const execMs =
              batch.outcome === 'refused' ? 980 : refined === 'nova' ? 3200 : 2700

            schedule(() => {
              setMoveLayer((prev) => ({
                ...prev,
                phase: 'cooldown',
              }))
              schedule(() => {
                setMoveLayer({ ...INITIAL_MOVE })
              }, 420)
            }, execMs)
          } catch (e) {
            logOptionalApiFailure('move-demo', e)
            clearMoveTimers()
            setMoveLayer({ ...INITIAL_MOVE })
          }
        })()
      }, 400)
    },
    [sessionId, clearMoveTimers, ingestCinematicProfile],
  )

  useEffect(() => () => clearMoveTimers(), [clearMoveTimers])

  const loadTactical = useCallback(async () => {
    setTacticalLoading(true)
    try {
      const t = await api.fetchTactical()
      setTactical(
        `${t.environment} · ${t.prediction} · ${t.recommended_defense.slice(0, 120)}…`,
      )
    } catch (e) {
      logOptionalApiFailure('tactical', e)
    } finally {
      setTacticalLoading(false)
    }
  }, [])

  const onVoiceNormalizeRoute = useCallback(async () => {
    const draft = normalizeWakeSnippet(input || voice.lastHeard)
    if (!draft) {
      setTranscript('Enter command text or speak first.')
      return
    }
    if (strictWake && !matchesWakePrefix(draft, wakePrefixes)) {
      setTranscript('Wake phrase required. Lead with “Kaiser,” (or disable strict wake).')
      return
    }
    if (!sessionId) return
    try {
      const ing = await api.postVoiceIngest(sessionId, draft, false)
      const sent = ing.normalized_text.trim() ? ing.normalized_text : draft
      dispatchPilotText(sent, true)
      setTranscript(
        `Voice ingest · ${ing.parsed.verb} (${String(ing.intent ?? '—')}). Normalized: ${sent.slice(0, 120)}${sent.length > 120 ? '…' : ''}`,
      )
    } catch (e) {
      logOptionalApiFailure('voice ingest (normalize)', e)
      setTranscript('Voice ingest failed (backend).')
    }
  }, [dispatchPilotText, input, sessionId, strictWake, voice.lastHeard, wakePrefixes])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    dispatchPilotText(input)
    setInput('')
  }

  const toggleStrictWake = useCallback((v: boolean) => {
    setStrictWake(v)
    localStorage.setItem('mazinkaiser.strictWake', v ? '1' : '0')
  }, [])

  const kaiserLine = useMemo(
    () =>
      assistantStream.trim() ||
      lastReply ||
      'Awaiting pilot directive. All systems nominal in simulation.',
    [assistantStream, lastReply],
  )

  const voiceSlice = useMemo(
    () => ({
      liveTranscript: voice.liveTranscript,
      lastHeard: voice.lastHeard,
      supportsStt: voice.supportsStt,
      startMicTap: voice.startMicTap,
    }),
    [voice.liveTranscript, voice.lastHeard, voice.supportsStt, voice.startMicTap],
  )

  const avatarCues = useMemo<AvatarRuntimeCues>(
    () => ({
      hud: hud ?? null,
      personalityMode: mode,
      ttsSpeaking,
      micListening,
      diagnosticUntilMs,
      move: moveLayer,
    }),
    [diagnosticUntilMs, hud, micListening, mode, moveLayer, ttsSpeaking],
  )

  const avatarPresentation = useMemo(() => {
    void avatarTick
    return resolveAvatarPresentation(avatarCues)
  }, [avatarCues, avatarTick])

  const sklMovePlayback = useMemo<SklMovePlaybackSnapshot>(
    () => ({
      phase: moveLayer.phase,
      backendMoveId: moveLayer.backendMoveId ?? null,
      animationPlan: moveLayer.animationPlan,
      executingStartedAtMs: moveLayer.executingStartedAtMs,
      moveLabel: moveLayer.label.trim() ? moveLayer.label : undefined,
    }),
    [
      moveLayer.phase,
      moveLayer.backendMoveId,
      moveLayer.animationPlan,
      moveLayer.executingStartedAtMs,
      moveLayer.label,
    ],
  )

  return (
    <CinematicCockpit
      wsStatus={status}
      sessionId={sessionId}
      cinematicScaleProfile={cinematicScaleProfile}
      ttsOn={ttsOn}
      toggleTts={() => setTtsOn((v) => !v)}
      hud={hud}
      kaiserLine={kaiserLine}
      subtitleStreaming={Boolean(assistantStream.trim())}
      avatarPresentation={avatarPresentation}
      movePlayback={sklMovePlayback}
      moveDemonstrationOverlay={{
        active: moveLayer.phase === 'executing',
        title: moveLayer.label || 'MOVE SEQUENCE',
        moveSlug: moveLayer.backendMoveId,
        visualHint: moveLayer.visualHint,
      }}
      personalityMode={mode}
      onPersonalityModeChange={(m) => void onPersonalityChange(m)}
      strictWake={strictWake}
      onStrictWakeChange={toggleStrictWake}
      onRunDiagnostics={() => void runDiagnosticsPass()}
      tacticalSnippet={tactical}
      tacticalLoading={tacticalLoading}
      onLoadTactical={() => void loadTactical()}
      onDemoMove={(m) => runMove(m)}
      commandInput={input}
      setCommandInput={setInput}
      transcript={transcript}
      assistantStream={assistantStream}
      voice={voiceSlice}
      pushToTalkProps={voice.pushToTalkHoldProps}
      onCommandSubmit={onSubmit}
      onVoiceNormalize={() => void onVoiceNormalizeRoute()}
    />
  )
}
