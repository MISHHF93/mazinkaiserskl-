import { describe, expect, it } from 'vitest'

import { pickMazinkaiserVoice, scoreVoiceForMazinkaiser, stripLiteForTts } from './kaiserVoice'

function mockVoice(p: Partial<SpeechSynthesisVoice> & { name: string }): SpeechSynthesisVoice {
  return p as SpeechSynthesisVoice
}

describe('kaiserVoice', () => {
  it('prefers male-sounding English names over female', () => {
    const a = mockVoice({ name: 'Microsoft Zira - English (United States)', lang: 'en-US' })
    const b = mockVoice({ name: 'Microsoft David - English (United States)', lang: 'en-US' })
    expect(scoreVoiceForMazinkaiser(b)).toBeGreaterThan(scoreVoiceForMazinkaiser(a))
    expect(pickMazinkaiserVoice([a, b])?.name).toContain('David')
  })

  it('stripLiteForTts removes code fences and emphasis', () => {
    expect(stripLiteForTts('Say `core` and **bold**')).toBe('Say core and bold')
    expect(stripLiteForTts('```js\nx()\n``` ok')).toBe('ok')
  })
})
