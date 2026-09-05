import type { AiOptionSchema, AiOptionValidator, AiReadonlyUnknownObject } from '@/lib/ai-registry/types'
import {
  booleanValidator, enumValidator, integerRangeValidator, nonEmptyStringValidator, stringArrayValidator,
  type MediaModality,
} from '@/lib/ai-providers/shared/option-schema'
import { ARK_IMAGE_RATIOS, requireArkImageModelSpec, type ArkImageModelSpec } from './image-models'
import { ARK_VIDEO_RATIOS, requireArkVideoModelSpec } from './video-models'

const identityValidators = {
  provider: nonEmptyStringValidator(), modelId: nonEmptyStringValidator(), modelKey: nonEmptyStringValidator(),
}

function imageSize(spec: ArkImageModelSpec, options: AiReadonlyUnknownObject): string | undefined {
  if (typeof options.resolution !== 'string') return undefined
  const sizes = spec.sizes[options.resolution]
  if (!sizes) return undefined
  if (typeof options.aspectRatio === 'string') {
    return Object.entries(sizes).find(([ratio]) => ratio === options.aspectRatio)?.[1]
  }
  if (typeof options.size === 'string' && Object.values(sizes).includes(options.size)) return options.size
  return undefined
}

function imageSchema(modelId: string): AiOptionSchema {
  const spec = requireArkImageModelSpec(modelId)
  const validators: Record<string, AiOptionValidator> = {
    ...identityValidators,
    resolution: enumValidator(Object.keys(spec.sizes)),
    aspectRatio: enumValidator(ARK_IMAGE_RATIOS),
    size: nonEmptyStringValidator(),
    referenceImages: stringArrayValidator({ maxLength: spec.maxReferenceImages }),
    outputFormat: enumValidator(['jpeg', 'png']),
    responseFormat: enumValidator(['url']),
    watermark: booleanValidator(),
  }
  return {
    allowedKeys: new Set(Object.keys(validators)),
    validators,
    required: ['resolution'],
    requiresOneOf: [{ keys: ['aspectRatio', 'size'], message: 'aspectRatio_or_size' }],
    objectValidators: [(options) => {
      const size = imageSize(spec, options)
      if (!size) return { ok: false, reason: 'size_not_in_selected_resolution' }
      if (options.size !== undefined && options.size !== size) return { ok: false, reason: 'size_conflicts_with_resolution_or_aspectRatio' }
      return { ok: true }
    }],
    normalize: (options) => ({
      ...options,
      size: imageSize(spec, options),
      // Product single-image output policy, resolved before billing/submission.
      responseFormat: 'url',
      outputFormat: options.outputFormat ?? 'jpeg',
      watermark: options.watermark ?? false,
    }),
  }
}

function videoSchema(modelId: string): AiOptionSchema {
  const spec = requireArkVideoModelSpec(modelId)
  const validators: Record<string, AiOptionValidator> = {
    ...identityValidators,
    prompt: nonEmptyStringValidator(),
    resolution: enumValidator(spec.resolutions),
    aspectRatio: enumValidator(ARK_VIDEO_RATIOS),
    duration: integerRangeValidator({ min: spec.durationMin, max: spec.durationMax }),
    generateAudio: booleanValidator(),
    watermark: booleanValidator(),
    returnLastFrame: booleanValidator(),
    serviceTier: enumValidator(['default']),
    executionExpiresAfter: integerRangeValidator({ min: 3600, max: 259200 }),
    lastFrameImageUrl: nonEmptyStringValidator(),
    referenceImages: stringArrayValidator({ maxLength: spec.maxReferenceImages }),
    referenceAudios: stringArrayValidator({ maxLength: spec.maxReferenceAudios }),
    referenceVideos: stringArrayValidator({ maxLength: spec.maxReferenceVideos }),
  }
  return {
    allowedKeys: new Set(Object.keys(validators)),
    validators,
    required: ['resolution', 'aspectRatio', 'duration'],
    objectValidators: [(options) => {
      const images = Array.isArray(options.referenceImages) ? options.referenceImages.length : 0
      const audios = Array.isArray(options.referenceAudios) ? options.referenceAudios.length : 0
      const videos = Array.isArray(options.referenceVideos) ? options.referenceVideos.length : 0
      if (images + audios + videos > spec.maxReferenceFiles) return { ok: false, reason: `max_reference_files=${spec.maxReferenceFiles}` }
      if (spec.referenceAudioRequiresVisual && audios > 0 && images + videos === 0) return { ok: false, reason: 'reference_audio_requires_visual' }
      if (options.lastFrameImageUrl !== undefined && images + audios + videos > 0) return { ok: false, reason: 'last_frame_conflicts_with_references' }
      return { ok: true }
    }],
  }
}

// The existing engine/preflight invokes this schema. Adapters only project
// these normalized options; they do not run a second allowed/range validator.
export function resolveArkOptionSchema(modality: MediaModality, modelId: string): AiOptionSchema {
  if (modality === 'image') return imageSchema(modelId)
  if (modality === 'video') return videoSchema(modelId)
  throw new Error(`ARK_OPTION_SCHEMA_UNSUPPORTED_MODALITY:${modality}`)
}
