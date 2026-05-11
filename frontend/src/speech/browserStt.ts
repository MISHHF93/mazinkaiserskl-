/** Web Speech API factory — Whisper-compatible path sends text via `/voice/ingest` or WS. */

function recognitionCtor(): (new () => SpeechRecognition) | null {
  const w = window as Window & typeof globalThis
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) ?? null
}

export function isBrowserSttAvailable(): boolean {
  return !!recognitionCtor()
}

export type BrowserSttHandlers = {
  onInterim?: (text: string) => void
  onFinal?: (text: string) => void
  onAudioStart?: () => void
  onEnd?: () => void
  onError?: () => void
}

export function createRecognition(
  handlers: BrowserSttHandlers,
  lang = 'en-US',
  options: { continuous?: boolean } = {},
): SpeechRecognition | null {
  const Ctor = recognitionCtor()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = lang
  rec.interimResults = true
  rec.continuous = options.continuous ?? false
  rec.maxAlternatives = 1

  rec.onaudiostart = () => handlers.onAudioStart?.()

  rec.onresult = (ev: SpeechRecognitionEvent) => {
    let interim = ''
    let finalChunk = ''
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i]
      const piece = r?.[0]?.transcript ?? ''
      if (r.isFinal) finalChunk += piece
      else interim += piece
    }
    if (interim.trim()) handlers.onInterim?.(interim.trim())
    if (finalChunk.trim()) handlers.onFinal?.(finalChunk.trim())
  }

  rec.onerror = () => handlers.onError?.()
  rec.onend = () => handlers.onEnd?.()

  return rec
}

export function restartRecognitionPlaceholder(): void {
  /* Future: WASM wake word arms browser STT without repeated permission prompts. */
}
