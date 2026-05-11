import { useCallback, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

import { createRecognition, isBrowserSttAvailable } from '../speech/browserStt'

/** Push-to-talk STT + interim transcript for HUD; Kaiser Core path stays in parent (WS / REST). */

export function useVoiceInteractionLayer(opts: {
  lang?: string
  onUserFinalTranscript: (text: string) => void
  /** True while mic capture is active (browser recognition running). */
  onActivityChange: (listening: boolean) => void
}) {
  const recRef = useRef<SpeechRecognition | null>(null)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [lastHeard, setLastHeard] = useState('')
  const [supportsStt] = useState(() => isBrowserSttAvailable())

  const stopSession = useCallback(() => {
    try {
      recRef.current?.stop()
    } catch {
      /* aborted before start */
    }
    recRef.current = null
    opts.onActivityChange(false)
  }, [opts])

  const startPushToTalk = useCallback(() => {
    if (!supportsStt) {
      setLiveTranscript('Speech recognition not supported.')
      return
    }
    stopSession()
    window.speechSynthesis.cancel()
    setLiveTranscript('')
    const rec = createRecognition(
      {
        onAudioStart: () => opts.onActivityChange(true),
        onInterim: (t) => setLiveTranscript(t),
        onFinal: (t) => {
          setLastHeard(t)
          opts.onUserFinalTranscript(t)
          setLiveTranscript('')
        },
        onError: () => opts.onActivityChange(false),
        onEnd: () => opts.onActivityChange(false),
      },
      opts.lang ?? 'en-US',
      { continuous: false },
    )
    if (!rec) {
      setLiveTranscript('Speech recognition unavailable.')
      return
    }
    try {
      rec.start()
      recRef.current = rec
    } catch {
      setLiveTranscript('Mic could not start — check permissions.')
    }
  }, [opts, stopSession, supportsStt])

  /** Release PTT — finalize utterance. */
  const releasePushToTalk = useCallback(() => {
    stopSession()
  }, [stopSession])

  /** Hold-to-talk handlers (captures utterance between pointer down/up). */
  const pushToTalkHoldProps = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
      startPushToTalk()
    },
    onPointerUp: releasePushToTalk,
    onPointerLeave: releasePushToTalk,
    onPointerCancel: releasePushToTalk,
  }

  return {
    liveTranscript,
    lastHeard,
    supportsStt,
    startMicTap: startPushToTalk,
    releasePushToTalk,
    pushToTalkHoldProps,
  }
}
