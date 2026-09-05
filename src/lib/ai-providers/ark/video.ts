import { logInfo as _ulogInfo } from '@/lib/logging/core'
import { EXTERNAL_OPERATION } from '@/lib/external-operation/registry'
import type { AiProviderVideoExecutionContext } from '@/lib/ai-providers/runtime-types'
import { fetchWithProviderProxy } from '@/lib/http/outbound-proxy'
import { requireSelectedModelId } from '@/lib/ai-providers/shared/model-selection'
import { AppError } from '@/lib/errors/app-error'
import {
  fetchProviderWithRetry,
  readProviderJsonResponse,
} from '@/lib/ai-providers/failure'
import { throwArkSubmissionError } from './error'
import { requireArkVideoModelSpec, type ArkVideoResolution } from './video-models'

export interface ArkVideoTaskRequest {
  model: string
  content: Array<{
    type: 'image_url' | 'video_url' | 'audio_url' | 'text' | 'draft_task'
    image_url?: { url: string }
    video_url?: { url: string }
    audio_url?: { url: string }
    text?: string
    role?: 'first_frame' | 'last_frame' | 'reference_image' | 'reference_video' | 'reference_audio'
    draft_task?: { id: string }
  }>
  resolution?: ArkVideoResolution
  ratio?: string
  duration?: number
  frames?: number
  seed?: number
  camera_fixed?: boolean
  watermark?: boolean
  return_last_frame?: boolean
  service_tier?: 'default' | 'flex'
  execution_expires_after?: number
  generate_audio?: boolean
  draft?: boolean
  tools?: Array<{ type: 'web_search' }>
  omni_reference_task_type?: 'reference'
}

export interface ArkVideoTaskResponse {
  id: string
  model: string
  status: 'processing' | 'queued' | 'running' | 'succeeded' | 'failed' | 'expired' | 'cancelled'
  content?:
    | {
        video_url?: string
        image_url?: string
        audio_url?: string
      }
    | Array<{
        type?: 'video_url' | 'image_url' | 'audio_url'
        video_url?: { url?: string }
        image_url?: { url?: string }
        audio_url?: { url?: string }
      }>
  usage?: {
    completion_tokens?: number
    total_tokens?: number
    tool_usage?: { web_search?: number }
  }
  error?: { code: string; message: string }
}

export async function arkCreateVideoTask(
  request: ArkVideoTaskRequest,
  options: { apiKey: string; baseUrl: string; timeoutMs?: number; logPrefix?: string },
): Promise<{ id: string; [key: string]: unknown }> {
  if (!options.apiKey) throw new AppError('PROVIDER_AUTH_INVALID', undefined, { provider: 'ark' })

  const { apiKey, baseUrl, timeoutMs, logPrefix = '[Ark Video]' } = options
  const url = `${baseUrl.replace(/\/+$/, '')}/contents/generations/tasks`

  _ulogInfo(`${logPrefix} 创建视频任务, 模型: ${request.model}`)
  let response: Response
  try {
    response = await fetchProviderWithRetry({
      url,
      provider: 'ark',
      phase: 'submit',
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(request),
        operation: EXTERNAL_OPERATION.PROVIDER_SUBMIT,
        timeoutMs,
        scope: 'ark:video:create',
        fetchFn: fetchWithProviderProxy,
      },
    })
  } catch (error: unknown) {
    throwArkSubmissionError(error)
  }

  const data = await readProviderJsonResponse<{ id?: unknown; [key: string]: unknown }>({
    response,
    provider: 'ark',
    phase: 'submit',
  })
  const taskId = typeof data.id === 'string' ? data.id : ''
  _ulogInfo(`${logPrefix} 视频任务创建成功, taskId: ${taskId}`)
  return { ...data, id: taskId }
}

export async function arkQueryVideoTask(
  taskId: string,
  options: { apiKey: string; baseUrl: string; timeoutMs?: number; logPrefix?: string },
): Promise<ArkVideoTaskResponse> {
  if (!options.apiKey) throw new AppError('PROVIDER_AUTH_INVALID', undefined, { provider: 'ark' })

  const { apiKey, baseUrl, timeoutMs } = options
  const url = `${baseUrl.replace(/\/+$/, '')}/contents/generations/tasks/${taskId}`

  const response = await fetchProviderWithRetry({
    url,
    provider: 'ark',
    phase: 'poll',
    options: {
      operation: EXTERNAL_OPERATION.PROVIDER_POLL,
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      timeoutMs,
      scope: 'ark:video:query',
      fetchFn: fetchWithProviderProxy,
    },
  })

  return await readProviderJsonResponse<ArkVideoTaskResponse>({
    response,
    provider: 'ark',
    phase: 'poll',
  })
}

type ArkVideoOptions = NonNullable<AiProviderVideoExecutionContext['options']> & {
  resolution?: ArkVideoResolution
  serviceTier?: 'default'
  executionExpiresAfter?: number
  returnLastFrame?: boolean
  watermark?: boolean
}

export async function executeArkVideoGeneration(input: AiProviderVideoExecutionContext) {
  const options = (input.options ?? {}) as ArkVideoOptions
  const { apiKey, baseUrl } = input.providerConfig
  if (!baseUrl) throw new Error('PROVIDER_BASE_URL_MISSING: ark (video)')
  const spec = requireArkVideoModelSpec(requireSelectedModelId(input.selection, 'ark:video'))
  const inputImageUrl = input.imageUrl.trim()
  const referenceImages = options.referenceImages ?? []
  const referenceAudios = options.referenceAudios ?? []
  const referenceVideos = options.referenceVideos ?? []
  const hasReferences = referenceImages.length + referenceAudios.length + referenceVideos.length > 0

  // First-frame media is outside options. These checks concern actual-input
  // relationships only; option ranges/counts are owned by the model schema.
  if (options.lastFrameImageUrl && !inputImageUrl) throw new Error('ARK_VIDEO_LAST_FRAME_REQUIRES_FIRST_FRAME')
  if (inputImageUrl && hasReferences) throw new Error('ARK_VIDEO_OPTION_UNSUPPORTED: frame_with_references')

  const content: ArkVideoTaskRequest['content'] = []
  if (options.prompt) content.push({ type: 'text', text: options.prompt })
  if (inputImageUrl) content.push({ type: 'image_url', image_url: { url: inputImageUrl }, role: 'first_frame' })
  if (options.lastFrameImageUrl) content.push({ type: 'image_url', image_url: { url: options.lastFrameImageUrl }, role: 'last_frame' })
  for (const url of referenceImages) content.push({ type: 'image_url', image_url: { url }, role: 'reference_image' })
  for (const url of referenceAudios) content.push({ type: 'audio_url', audio_url: { url }, role: 'reference_audio' })
  for (const url of referenceVideos) content.push({ type: 'video_url', video_url: { url }, role: 'reference_video' })
  if (content.length === 0) throw new Error('ARK_VIDEO_INPUT_REQUIRED')

  const taskData = await arkCreateVideoTask({
    model: spec.modelId,
    content,
    resolution: options.resolution,
    ratio: inputImageUrl && spec.frameRatio === 'adaptive' ? 'adaptive' : options.aspectRatio,
    duration: options.duration,
    generate_audio: options.generateAudio,
    watermark: options.watermark,
    return_last_frame: options.returnLastFrame,
    service_tier: options.serviceTier,
    execution_expires_after: options.executionExpiresAfter,
    ...(hasReferences && spec.omniReferenceTaskType
      ? { omni_reference_task_type: spec.omniReferenceTaskType }
      : {}),
  }, { apiKey, baseUrl, logPrefix: '[ARK Video]' })
  const taskId = taskData.id
  if (!taskId) throw new Error('ARK_VIDEO_TASK_CREATE_INVALID_RESPONSE: missing task id')
  return {
    success: true as const,
    async: true,
    requestId: taskId,
    externalId: `ARK:VIDEO:${taskId}`,
  }
}
