import type { PlatformModelPreset } from '@/lib/platform-models/types'
import { ARK_IMAGE_MODELS } from './image-models'
import { ARK_VIDEO_MODELS } from './video-models'
import { ARK_LLM_MODELS } from './llm-models'

export const ARK_API_CONFIG_CATALOG_MODELS = [
  ...ARK_LLM_MODELS.map(({ modelId, name }) => ({ modelId, name, type: 'llm' as const, provider: 'ark' })),
  ...ARK_IMAGE_MODELS.map(({ modelId, name }) => ({ modelId, name, type: 'image' as const, provider: 'ark' })),
  ...ARK_VIDEO_MODELS.map(({ modelId, name }) => ({ modelId, name, type: 'video' as const, provider: 'ark' })),
]

// Selection catalogs only. Historical ARK external IDs still resolve through
// the model-independent async task provider; no persistent records are deleted.
export const ARK_PLATFORM_MODEL_PRESETS = ARK_API_CONFIG_CATALOG_MODELS satisfies ReadonlyArray<PlatformModelPreset>

export const ARK_BUILTIN_CAPABILITY_CATALOG_ENTRIES = [
  ...ARK_LLM_MODELS.map((model) => ({
    modelType: 'llm' as const, provider: 'ark', modelId: model.modelId,
    capabilities: { llm: {
      protocol: 'openai-responses' as const,
      publicReasoningMode: model.publicReasoningMode,
      contextWindow: model.contextWindow,
      reasoningEffortOptions: [...model.reasoningEffortOptions],
      defaultReasoningEffort: model.defaultReasoningEffort,
    } },
  })),
  ...ARK_IMAGE_MODELS.map((model) => ({
    modelType: 'image' as const, provider: 'ark', modelId: model.modelId,
    capabilities: { image: { resolutionOptions: Object.keys(model.sizes), maxReferenceImages: model.maxReferenceImages } },
  })),
  ...ARK_VIDEO_MODELS.map((model) => ({
    modelType: 'video' as const, provider: 'ark', modelId: model.modelId,
    capabilities: { video: {
      supportedInputModes: ['text_to_video', 'first_frame', 'first_last_frame', 'reference'] as const,
      supportsTextToVideo: true,
      generationModeOptions: ['normal', 'firstlastframe'],
      generateAudioOptions: [true, false],
      durationOptions: Array.from({ length: model.durationMax - model.durationMin + 1 }, (_, i) => model.durationMin + i),
      resolutionOptions: [...model.resolutions],
      firstlastframe: true,
      firstFrameAspectRatio: model.frameRatio,
      supportGenerateAudio: true,
      assetReferenceMultiReference: true,
      maxReferenceImages: model.maxReferenceImages,
      maxReferenceAudios: model.maxReferenceAudios,
      maxReferenceVideos: model.maxReferenceVideos,
      maxReferenceFiles: model.maxReferenceFiles,
      referenceAudioRequiresVisual: model.referenceAudioRequiresVisual,
      minReferenceAudioDurationMs: model.minReferenceAudioDurationMs,
      maxReferenceAudioDurationMs: model.maxReferenceAudioDurationMs,
      maxTotalReferenceAudioDurationMs: model.maxTotalReferenceAudioDurationMs,
      minReferenceVideoDurationMs: model.minReferenceVideoDurationMs,
      maxReferenceVideoDurationMs: model.maxReferenceVideoDurationMs,
      maxTotalReferenceVideoDurationMs: model.maxTotalReferenceVideoDurationMs,
    } },
  })),
]
