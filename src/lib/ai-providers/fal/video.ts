import { createScopedLogger } from '@/lib/logging/core'
import type { AiProviderVideoExecutionContext, GenerateResult } from '@/lib/ai-providers/runtime-types'
import { requireSelectedModelId } from '@/lib/ai-providers/shared/model-selection'
import { submitFalQueueRequest } from '@/lib/ai-providers/fal/submission'
import {
  FAL_HAPPY_HORSE_IMAGE_TO_VIDEO_MODEL_ID,
  FAL_KLING_O3_PRO_IMAGE_TO_VIDEO_MODEL_ID,
  FAL_KLING_O3_STANDARD_IMAGE_TO_VIDEO_MODEL_ID,
  FAL_KLING_V3_PRO_IMAGE_TO_VIDEO_MODEL_ID,
  FAL_KLING_V3_STANDARD_IMAGE_TO_VIDEO_MODEL_ID,
  FAL_SEEDANCE_2_FAST_VIDEO_MODEL_ID,
  FAL_SEEDANCE_2_VIDEO_MODEL_ID,
} from './models'

/** Wire projection only. The engine and planner share the registry option validator. */
export function buildFalVideoRequest(input: Pick<AiProviderVideoExecutionContext, 'selection' | 'imageUrl' | 'options'>): {
  endpoint: string
  payload: Record<string, unknown>
} {
  const modelId = requireSelectedModelId(input.selection, 'fal:video')
  const options = input.options ?? {}
  const prompt = options.prompt ?? ''
  const images = options.referenceImages ?? []
  const audios = options.referenceAudios ?? []
  const videos = options.referenceVideos ?? []
  const duration = options.duration === undefined ? {} : { duration: String(options.duration) }
  const resolution = options.resolution === undefined ? {} : { resolution: options.resolution }
  const ratio = options.aspectRatio === undefined ? {} : { aspect_ratio: options.aspectRatio }
  const audio = options.generateAudio === undefined ? {} : { generate_audio: options.generateAudio }
  const endFrame = options.lastFrameImageUrl ? { end_image_url: options.lastFrameImageUrl } : {}

  if (modelId === FAL_SEEDANCE_2_VIDEO_MODEL_ID || modelId === FAL_SEEDANCE_2_FAST_VIDEO_MODEL_ID) {
    const prefix = modelId
    const shared = { prompt, ...duration, ...resolution, ...ratio, ...audio }
    if (input.imageUrl) return {
      endpoint: `${prefix}/image-to-video`,
      payload: { ...shared, image_url: input.imageUrl, ...endFrame },
    }
    if (images.length || audios.length || videos.length) return {
      endpoint: `${prefix}/reference-to-video`,
      payload: {
        ...shared,
        ...(images.length ? { image_urls: images } : {}),
        ...(audios.length ? { audio_urls: audios } : {}),
        ...(videos.length ? { video_urls: videos } : {}),
      },
    }
    return { endpoint: `${prefix}/text-to-video`, payload: shared }
  }
  if (modelId === FAL_HAPPY_HORSE_IMAGE_TO_VIDEO_MODEL_ID && images.length) return {
    endpoint: 'alibaba/happy-horse/reference-to-video',
    payload: { prompt, image_urls: images, ...ratio, ...resolution, ...(options.duration === undefined ? {} : { duration: options.duration }) },
  }
  if (modelId === 'fal-veo31' && images.length) return {
    endpoint: 'fal-ai/veo3.1/fast/reference-to-video',
    payload: {
      prompt, image_urls: images, ...ratio, ...resolution, ...audio,
      ...(options.duration === undefined ? {} : { duration: `${options.duration}s` }),
    },
  }
  // These endpoints require an explicit first frame. Reference images never
  // acquire first/last-frame meaning by array position.
  if (!input.imageUrl) throw new Error(`FAL_VIDEO_FIRST_FRAME_REQUIRED:${modelId}`)
  switch (modelId) {
    case 'fal-wan25':
      return { endpoint: 'wan/v2.6/image-to-video', payload: { prompt, image_url: input.imageUrl, ...duration, ...resolution } }
    case 'fal-veo31':
      return {
        endpoint: 'fal-ai/veo3.1/fast/image-to-video',
        payload: { prompt, image_url: input.imageUrl, ...ratio, ...resolution, ...audio, ...(options.duration === undefined ? {} : { duration: `${options.duration}s` }) },
      }
    case FAL_HAPPY_HORSE_IMAGE_TO_VIDEO_MODEL_ID:
      return {
        endpoint: modelId,
        payload: { prompt, image_url: input.imageUrl, ...resolution, ...(options.duration === undefined ? {} : { duration: options.duration }) },
      }
    case 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video':
      return {
        endpoint: modelId,
        payload: { prompt, image_url: input.imageUrl, ...duration, ...(options.lastFrameImageUrl ? { tail_image_url: options.lastFrameImageUrl } : {}) },
      }
    case FAL_KLING_O3_STANDARD_IMAGE_TO_VIDEO_MODEL_ID:
    case FAL_KLING_O3_PRO_IMAGE_TO_VIDEO_MODEL_ID:
      return { endpoint: modelId, payload: { prompt, image_url: input.imageUrl, ...endFrame, ...duration, ...audio } }
    case FAL_KLING_V3_STANDARD_IMAGE_TO_VIDEO_MODEL_ID:
    case FAL_KLING_V3_PRO_IMAGE_TO_VIDEO_MODEL_ID:
      return { endpoint: modelId, payload: { prompt, start_image_url: input.imageUrl, ...endFrame, ...duration, generate_audio: false } }
    default:
      throw new Error(`FAL_VIDEO_MODEL_UNSUPPORTED:${modelId}`)
  }
}

export async function executeFalVideoGeneration(input: AiProviderVideoExecutionContext): Promise<GenerateResult> {
  const { endpoint, payload } = buildFalVideoRequest(input)
  const logger = createScopedLogger({ module: 'worker.fal-video', action: 'fal_video_generate' })
  logger.info({ message: 'FAL video generation request', details: { modelId: input.selection.modelId, endpoint } })
  const requestId = await submitFalQueueRequest({
    endpoint, apiKey: input.providerConfig.apiKey, payload, scope: `fal:video:submit:${endpoint}`,
  })
  return { success: true, async: true, requestId, endpoint, externalId: `FAL:VIDEO:${endpoint}:${requestId}` }
}
