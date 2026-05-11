import { useCallback, useEffect, useRef, useState } from 'react'
import type { MazinkaiserCinematicScaleProfile, MechaHudState } from '../types'
import { MAZINKAISER_CINEMATIC_SCALE_FALLBACK } from '../types'
import { cockpitUplinkDisabled, cockpitWsUrl } from '../config'
import {
  parseCockpitRealtimePayload,
  parseMoveExecutionBatch,
  type CockpitRealtimeEvent,
  type SKLMoveExecutionBatch,
} from '@mazinkaiser/shared-types'
import { useCockpitTraceStore } from '../stores/cockpitTraceStore'
import {
  buildHelloFrame,
  extractHudPayload,
  websocketReconnectDelayMs,
} from '../realtime/cockpitRealtime'

/** `preview` = uplink intentionally off (`VITE_COCKPIT_DISABLE`), local hull/assets only. */
type WsStatus = 'connecting' | 'open' | 'closed' | 'error' | 'preview'

/** Wire shape for `move_batch` — canonical `@mazinkaiser/shared-types` name is {@link SKLMoveExecutionBatch}. */
export type MoveBatchWire = SKLMoveExecutionBatch

type WsInbound = {
  type: string
  session_id?: string
  state?: MechaHudState
  telemetry?: MechaHudState
  text?: string
  token?: string
  trace_id?: string
  move_batch?: MoveBatchWire
  cinematic_scale_profile?: MazinkaiserCinematicScaleProfile
}

export type CockpitWsHandlers = {
  /** Fired when another client (or REST) completes a move on the same session. */
  onInboundMoveBatch?: (batch: MoveBatchWire) => void
}

export function useCockpitWs(handlers?: CockpitWsHandlers) {
  const [status, setStatus] = useState<WsStatus>(() => (cockpitUplinkDisabled() ? 'preview' : 'connecting'))
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [hud, setHud] = useState<MechaHudState | null>(null)
  const [lastReply, setLastReply] = useState('')
  const [assistantStream, setAssistantStream] = useState('')
  const [assistDone, setAssistDone] = useState(false)
  const [cinematicScaleProfile, setCinematicScaleProfile] = useState<MazinkaiserCinematicScaleProfile>(
    MAZINKAISER_CINEMATIC_SCALE_FALLBACK,
  )

  const wsRef = useRef<WebSocket | null>(null)
  const intentionalCloseRef = useRef(false)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef<number | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const handlersRef = useRef<CockpitWsHandlers | undefined>(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  const connectRef = useRef<(sid?: string | null) => void>(() => {})

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current != null) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const connect = useCallback(
    (sid?: string | null) => {
      if (cockpitUplinkDisabled()) {
        setStatus('preview')
        return
      }
      intentionalCloseRef.current = false
      clearReconnectTimer()
      wsRef.current?.close()
      const url = cockpitWsUrl(sid)
      const ws = new WebSocket(url)
      wsRef.current = ws
      setStatus('connecting')

      ws.onopen = () => {
        setStatus('open')
        reconnectAttemptRef.current = 0
        ws.send(JSON.stringify(buildHelloFrame(['telemetry', 'moves', 'avatar', 'assistant'])))
      }
      ws.onerror = () => setStatus('error')
      ws.onclose = () => {
        setStatus('closed')
        if (intentionalCloseRef.current) return
        const delay = websocketReconnectDelayMs(reconnectAttemptRef.current++)
        clearReconnectTimer()
        reconnectTimerRef.current = window.setTimeout(() => {
          connectRef.current(sessionIdRef.current)
        }, delay)
      }

      ws.onmessage = (ev) => {
        try {
          const raw: unknown = JSON.parse(ev.data as string)
          const inbound = parseCockpitRealtimePayload(raw)
          const msg: CockpitRealtimeEvent | WsInbound = inbound.ok
            ? inbound.event
            : (raw as WsInbound)

          if (!inbound.ok && import.meta.env.DEV) {
            console.warn('[cockpit-ws] frame partial schema match', inbound.issues)
          }

          if (msg.type === 'welcome' && 'session_id' in msg && typeof msg.session_id === 'string') {
            sessionIdRef.current = msg.session_id
            setSessionId(msg.session_id)
            setAssistDone(false)
            const p =
              'cinematic_scale_profile' in msg && msg.cinematic_scale_profile != null
                ? msg.cinematic_scale_profile
                : undefined
            if (p && typeof p === 'object' && 'height_meters' in p && typeof p.height_meters === 'number') {
              setCinematicScaleProfile(p as MazinkaiserCinematicScaleProfile)
            }
          }

          const fromTelem = extractHudPayload(msg as unknown)
          if (fromTelem) {
            setHud(fromTelem)
            setAssistDone(false)
          }

          if (msg.type === 'session' && 'session_id' in msg && typeof msg.session_id === 'string') {
            sessionIdRef.current = msg.session_id
            setSessionId(msg.session_id)
            if ('state' in msg && msg.state) {
              const h = extractHudPayload({ type: 'session', session_id: msg.session_id, state: msg.state } as unknown)
              if (h) setHud(h)
            }
            setAssistDone(false)
          }

          if (msg.type === 'move_event' && 'move_batch' in msg && msg.move_batch && typeof msg.move_batch === 'object') {
            const mb = parseMoveExecutionBatch(msg.move_batch) ?? (msg.move_batch as SKLMoveExecutionBatch)
            const h = extractHudPayload(msg as unknown)
            if (h) setHud(h)
            handlersRef.current?.onInboundMoveBatch?.(mb)
          }

          if (msg.type === 'assistant' && typeof (msg as WsInbound).text === 'string') {
            setLastReply((msg as WsInbound).text as string)
            setAssistantStream('')
            setAssistDone(false)
            const tid = typeof (msg as WsInbound).trace_id === 'string' ? (msg as WsInbound).trace_id : undefined
            useCockpitTraceStore.getState().setFromAssistantFrame(tid, 'assistant')
          }
          if (msg.type === 'assistant_token' && typeof (msg as WsInbound).token === 'string') {
            setAssistantStream((prev) => prev + ((msg as WsInbound).token as string))
            const tid = typeof (msg as WsInbound).trace_id === 'string' ? (msg as WsInbound).trace_id : undefined
            useCockpitTraceStore.getState().setFromAssistantFrame(tid, 'assistant_token')
          }
          if (msg.type === 'assistant_done') {
            setAssistDone(true)
            const tid = typeof (msg as WsInbound).trace_id === 'string' ? (msg as WsInbound).trace_id : undefined
            useCockpitTraceStore.getState().setFromAssistantFrame(tid, 'assistant_done')
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[cockpit-ws] dropped malformed or unhandled frame', err)
          }
        }
      }
    },
    [clearReconnectTimer],
  )

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    if (cockpitUplinkDisabled()) {
      intentionalCloseRef.current = false
      clearReconnectTimer()
      wsRef.current?.close()
      return
    }
    intentionalCloseRef.current = false
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      connect()
    })
    return () => {
      cancelled = true
      intentionalCloseRef.current = true
      clearReconnectTimer()
      wsRef.current?.close()
    }
  }, [connect, clearReconnectTimer])

  const sendChat = useCallback((text: string, mode?: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    setAssistDone(false)
    setAssistantStream('')
    ws.send(JSON.stringify({ type: 'chat', text, mode }))
  }, [])

  const consumeAssistPlayback = useCallback(() => setAssistDone(false), [])

  const ingestCinematicProfile = useCallback((p: MazinkaiserCinematicScaleProfile | undefined) => {
    if (p && typeof p.height_meters === 'number') setCinematicScaleProfile(p)
  }, [])

  const forceReconnect = useCallback(() => {
    reconnectAttemptRef.current = 0
    clearReconnectTimer()
    connect(sessionIdRef.current)
  }, [clearReconnectTimer, connect])

  return {
    status,
    sessionId,
    hud,
    cinematicScaleProfile,
    lastReply,
    assistantStream,
    assistDone,
    consumeAssistPlayback,
    sendChat,
    reconnect: connect,
    forceReconnect,
    ingestCinematicProfile,
  }
}
