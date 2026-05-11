import { z } from 'zod'

import type { ExplainabilityMetadata } from './governance.js'

/** Streaming / final assistant text from cockpit WS (`assistant`, `assistant_token`, `assistant_done`). */
export const sklAssistantFrameSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('assistant'),
    text: z.string(),
    trace_id: z.string().optional(),
  }),
  z.object({
    type: z.literal('assistant_token'),
    token: z.string(),
    trace_id: z.string().optional(),
  }),
  z.object({
    type: z.literal('assistant_done'),
    trace_id: z.string().optional(),
  }),
])

export type SKLAIAssistantFrame = z.infer<typeof sklAssistantFrameSchema>

/** High-level label for governance / logging (not a wire envelope). */
export type SKLAIResponse = {
  kind: 'assistant_final' | 'stream_token' | 'stream_done'
  text?: string
  token?: string
  traceId?: string | undefined
  /** Optional client-side or mirrored governance fields (no keys by default on wire). */
  explainability?: ExplainabilityMetadata | undefined
}
