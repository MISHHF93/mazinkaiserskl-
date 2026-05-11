import { useCallback, useEffect, useRef, useState } from 'react'
import type { MazinkaiserCinematicScaleProfile, MechaHudState } from '../types'
import { MAZINKAISER_CINEMATIC_SCALE_FALLBACK } from '../types'
import { cockpitUplinkDisabled, cockpitWsUrl } from '../config'
import {
  buildHelloFrame,
  extractHudPayload,
  websocketReconnectDelayMs,
} from '../realtime/cockpitRealtime'

/** `preview` = uplink intentionally off (`VITE_COCKPIT_DISABLE`), local hull/assets only. */
type WsStatus = 'connecting' | 'open' | 'closed' | 'error' | 'preview'

export type MoveBatchWire = {
  outcome?: string
  move_id?: string
  animation_plan?: Record<string, unknown>[]
  voice_line?: string
}

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
          const msg = JSON.parse(ev.data as string) as WsInbound
          if (msg.type === 'welcome' && msg.session_id) {
            sessionIdRef.current = msg.session_id
            setSessionId(msg.session_id)
            setAssistDone(false)
            const p = msg.cinematic_scale_profile
            if (p && typeof p.height_meters === 'number') {
              setCinematicScaleProfile(p)
            }
          }
          const fromTelem = extractHudPayload(msg)
          if (fromTelem) {
            setHud(fromTelem)
            setAssistDone(false)
          }
          if (msg.type === 'session' && msg.session_id) {
            sessionIdRef.current = msg.session_id
            setSessionId(msg.session_id)
            if (msg.state) setHud(msg.state)
            setAssistDone(false)
          }
          if (msg.type === 'move_event' && msg.move_batch && typeof msg.move_batch === 'object') {
            if (msg.telemetry && typeof msg.telemetry === 'object') {
              setHud(msg.telemetry as MechaHudState)
            }
            handlersRef.current?.onInboundMoveBatch?.(msg.move_batch)
          }
          if (msg.type === 'assistant' && typeof msg.text === 'string') {
            setLastReply(msg.text)
            setAssistantStream('')
            setAssistDone(false)
          }
          if (msg.type === 'assistant_token' && typeof msg.token === 'string') {
            setAssistantStream((prev) => prev + msg.token)
          }
          if (msg.type === 'assistant_done') setAssistDone(true)
        } catch {
          /* ignore */
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
