import { z } from 'zod'

/** Mirrors `POST /api/v1/voice/ingest` JSON (Pydantic on server). */
export const voiceIngestResponseSchema = z.object({
  session_id: z.string(),
  raw_transcript: z.string(),
  normalized_text: z.string(),
  stt_provider: z.string(),
  intent: z.string().nullable(),
  parsed: z.object({
    verb: z.string(),
    tokens: z.array(z.string()),
    confidence: z.number(),
  }),
  tts_hints: z.record(z.string(), z.unknown()),
  wake_routing: z.record(z.string(), z.unknown()),
  hull_voice_nlp: z.record(z.string(), z.unknown()).optional(),
  hull_voice_nlu: z.record(z.string(), z.unknown()).optional(),
})

export type VoiceIngestResponseWire = z.infer<typeof voiceIngestResponseSchema>

export function parseVoiceIngestResponse(raw: unknown): VoiceIngestResponseWire | null {
  const r = voiceIngestResponseSchema.safeParse(raw)
  return r.success ? r.data : null
}
