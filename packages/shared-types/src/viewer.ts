import { z } from 'zod'

/** Cockpit hull presentation mode (UI-level, not backend enum). */
export const viewerModeSchema = z.enum(['image', 'skl_3d', 'live2d', 'unreal_stream'])
export type ViewerMode = z.infer<typeof viewerModeSchema>

export const lightingPresetSchema = z.enum(['STUDIO', 'SKL_COCKPIT', 'INFERNO', 'DIAGNOSTIC'])
export type LightingPresetId = z.infer<typeof lightingPresetSchema>

export const cameraModeSchema = z.enum(['pilot', 'cinematic', 'diagnostic', 'move'])
export type CameraMode = z.infer<typeof cameraModeSchema>

export const sklViewerConfigSchema = z.object({
  lightingPreset: lightingPresetSchema,
  cameraMode: cameraModeSchema,
  autoRotate: z.boolean().optional(),
  showDebugBounds: z.boolean().optional(),
})

export type SKLViewerConfig = z.infer<typeof sklViewerConfigSchema>

/** Inspect-only metadata from glTF (extensible). */
export const sklModelMetadataSchema = z.object({
  glbPath: z.string(),
  clipNames: z.array(z.string()),
  nodeCount: z.number().int().nonnegative().optional(),
})

export type SKLModelMetadata = z.infer<typeof sklModelMetadataSchema>

export const sklAnimationStateSchema = z.object({
  activeClipName: z.string().nullable(),
  mixerTime: z.number(),
  isSpeakingPulse: z.boolean().optional(),
})

export type SKLAnimationState = z.infer<typeof sklAnimationStateSchema>
