/** Browser SpeechSynthesis — swappable façade for future OpenAI/Azure TTS. */

export type SpeakCallback = () => void

export function cancelBrowserSpeech(): void {
  window.speechSynthesis.cancel()
}

export function speakWithBrowser(params: {
  text: string
  rate?: number
  pitch?: number
  lang?: string
  onStart?: SpeakCallback
  onEnd?: SpeakCallback
  onError?: (e: SpeechSynthesisErrorEvent) => void
}): SpeechSynthesisUtterance | null {
  const t = params.text.trim()
  if (!t) return null
  cancelBrowserSpeech()
  const u = new SpeechSynthesisUtterance(t)
  u.rate = params.rate ?? 1.05
  u.pitch = params.pitch ?? 1.0
  u.lang = params.lang ?? (document.documentElement.lang || 'en-US')
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
