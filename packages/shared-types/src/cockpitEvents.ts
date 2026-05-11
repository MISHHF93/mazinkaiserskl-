import type { SKLTelemetryState } from './telemetry.js'
import type { SKLMoveExecutionBatch } from './moveExecution.js'
import type { SklAnimationPipelineEvent } from './animationPipeline.js'
import type { SessionMemoryEvent } from './memory.js'

/**
 * Client-side cockpit domain events (UI/runtime — not wire payloads).
 * Use for future event bus / tracing; WS/REST ingress stays in `cockpitRealtime` / `apiContracts`.
 */
export type CockpitTelemetryEvent = {
  kind: 'telemetry'
  state: SKLTelemetryState
  source: 'ws' | 'rest'
}

export type CockpitMoveEvent = {
  kind: 'move_batch'
  batch: SKLMoveExecutionBatch
  source: 'ws' | 'rest'
}

export type CockpitAssistantEvent = {
  kind: 'assistant'
  phase: 'token' | 'final' | 'done'
  text?: string | undefined
  token?: string | undefined
  traceId?: string | undefined
}

export type CockpitVoiceEvent = {
  kind: 'voice'
  phase: 'listening' | 'result' | 'error'
  transcript?: string | undefined
}

export type CockpitAnimationEvent = {
  kind: 'animation_pipeline'
  event: SklAnimationPipelineEvent
}

export type CockpitMemoryEvent = {
  kind: 'memory'
  event: SessionMemoryEvent
}

export type CockpitEvent =
  | CockpitTelemetryEvent
  | CockpitMoveEvent
  | CockpitAssistantEvent
  | CockpitVoiceEvent
  | CockpitAnimationEvent
  | CockpitMemoryEvent
