/** Browser SpeechSynthesis — swappable façade for future OpenAI/Azure TTS. */

import {
  MAZINKAISER_TTS_PROSODY,
  getResolvedMazinkaiserVoice,
  stripLiteForTts,
} from './kaiserVoice'

export type SpeakCallback = () => void

export type BrowserTtsProfile = 'mazinkaiser' | 'neutral'

export function cancelBrowserSpeech(): void {
  window.speechSynthesis.cancel()
}

export function speakWithBrowser(params: {
  text: string
  /** Mazinkaiser: baritone-style prosody + best-effort male EN voice from the OS list. */
  profile?: BrowserTtsProfile
  /** When true (default for `mazinkaiser`), strip trivial markdown before speaking. */
  prepareText?: boolean
  rate?: number
  pitch?: number
  volume?: number
  lang?: string
  voice?: SpeechSynthesisVoice | null
  onStart?: SpeakCallback
  onEnd?: SpeakCallback
  onError?: (e: SpeechSynthesisErrorEvent) => void
}): SpeechSynthesisUtterance | null {
  const profile = params.profile ?? 'mazinkaiser'
  let raw = params.text.trim()
  if (!raw) return null
  if (params.prepareText !== false && profile === 'mazinkaiser') {
    raw = stripLiteForTts(raw)
  }
  if (!raw) {
    queueMicrotask(() => params.onEnd?.())
    return null
  }

  cancelBrowserSpeech()
  const u = new SpeechSynthesisUtterance(raw)

  if (profile === 'mazinkaiser') {
    const v = params.voice !== undefined ? params.voice : getResolvedMazinkaiserVoice()
    if (v) u.voice = v
    u.rate = params.rate ?? MAZINKAISER_TTS_PROSODY.rate
    u.pitch = params.pitch ?? MAZINKAISER_TTS_PROSODY.pitch
    u.volume = params.volume ?? MAZINKAISER_TTS_PROSODY.volume
    u.lang = params.lang ?? v?.lang ?? (document.documentElement.lang || 'en-US')
  } else {
    u.rate = params.rate ?? 1.05
    u.pitch = params.pitch ?? 1.0
    u.volume = params.volume ?? 1
    u.lang = params.lang ?? (document.documentElement.lang || 'en-US')
  }

  if (params.onStart) u.onstart = params.onStart
  if (params.onEnd) u.onend = params.onEnd
  if (params.onError) u.onerror = params.onError
  window.speechSynthesis.speak(u)
  return u
}

export function subscribeBrowserSpeakingPoll(onSpeaking: (v: boolean) => void): () => void {
  let id: ReturnType<typeof setTimeout> | undefined
  let cancelled = false
  const loop = () => {
    if (cancelled) return
    onSpeaking(window.speechSynthesis.speaking)
    id = window.setTimeout(loop, 120)
  }
  loop()
  return () => {
    cancelled = true
    if (id !== undefined) window.clearTimeout(id)
  }
}
