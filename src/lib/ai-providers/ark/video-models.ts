// https://docs.volcengine.com/docs/82379/1520757 (2026-09-04)
export const ARK_VIDEO_RATIOS = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'] as const
export type ArkVideoResolution = '480p' | '720p' | '1080p' | '4k'

export interface ArkVideoModelSpec {
  readonly modelId: string
  readonly name: string
  readonly durationMin: number
  readonly durationMax: number
  readonly resolutions: readonly ArkVideoResolution[]
  readonly frameRatio: 'selected' | 'adaptive'
  readonly omniReferenceTaskType: 'reference' | undefined
  readonly maxReferenceImages: number
  readonly maxReferenceAudios: number
  readonly maxReferenceVideos: number
  readonly maxReferenceFiles: number
  readonly referenceAudioRequiresVisual: boolean
  readonly minReferenceAudioDurationMs: number
  readonly maxReferenceAudioDurationMs: number
  readonly maxTotalReferenceAudioDurationMs: number
  readonly minReferenceVideoDurationMs: number
  readonly maxReferenceVideoDurationMs: number
  readonly maxTotalReferenceVideoDurationMs: number
}

const seedance2References = {
  maxReferenceImages: 9, maxReferenceAudios: 3, maxReferenceVideos: 3, maxReferenceFiles: 15,
  referenceAudioRequiresVisual: true,
  minReferenceAudioDurationMs: 2_000, maxReferenceAudioDurationMs: 15_000, maxTotalReferenceAudioDurationMs: 15_000,
  minReferenceVideoDurationMs: 2_000, maxReferenceVideoDurationMs: 15_000, maxTotalReferenceVideoDurationMs: 15_000,
} as const

export const ARK_VIDEO_MODELS: readonly ArkVideoModelSpec[] = [
  {
    modelId: 'doubao-seedance-2-0-260128', name: 'Seedance 2.0',
    durationMin: 4, durationMax: 15, resolutions: ['480p', '720p', '1080p', '4k'],
    frameRatio: 'selected', omniReferenceTaskType: undefined, ...seedance2References,
  },
  {
    modelId: 'doubao-seedance-2-0-fast-260128', name: 'Seedance 2.0 Fast',
    durationMin: 4, durationMax: 15, resolutions: ['480p', '720p'],
    frameRatio: 'selected', omniReferenceTaskType: undefined, ...seedance2References,
  },
  {
    modelId: 'doubao-seedance-2-5-260628', name: 'Seedance 2.5',
    durationMin: 4, durationMax: 30, resolutions: ['480p', '720p', '1080p'],
    frameRatio: 'adaptive', omniReferenceTaskType: 'reference',
    maxReferenceImages: 30, maxReferenceAudios: 10, maxReferenceVideos: 10, maxReferenceFiles: 50,
    referenceAudioRequiresVisual: false,
    minReferenceAudioDurationMs: 2_000, maxReferenceAudioDurationMs: 30_000, maxTotalReferenceAudioDurationMs: 30_000,
    minReferenceVideoDurationMs: 2_000, maxReferenceVideoDurationMs: 30_000, maxTotalReferenceVideoDurationMs: 30_000,
  },
]

export function requireArkVideoModelSpec(modelId: string): ArkVideoModelSpec {
  const spec = ARK_VIDEO_MODELS.find((model) => model.modelId === modelId)
  if (!spec) throw new Error(`ARK_VIDEO_MODEL_UNSUPPORTED:${modelId}`)
  return spec
}
