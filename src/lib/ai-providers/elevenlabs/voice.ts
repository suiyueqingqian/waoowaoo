import { z } from 'zod'
import type { AiProviderVoiceExecutionContext, GenerateResult } from '@/lib/ai-providers/runtime-types'
import { requireSelectedModelId } from '@/lib/ai-providers/shared/model-selection'
import { AppError } from '@/lib/errors/app-error'
import { fetchWithProviderProxy } from '@/lib/http/outbound-proxy'
import { decodeBase64WithLimit } from '@/lib/http/body-limits'
import { readProviderJsonResponse, ProviderHttpError } from '@/lib/ai-providers/failure'
import { buildElevenLabsUrl } from './base-url'
import { throwElevenLabsHttpFailure } from './http-failure'
import { ELEVENLABS_VOICE_DESIGN_V3_MODEL_ID } from './models'

const voiceDesignResponseSchema = z.object({
  text: z.string(),
  previews: z.array(z.object({
    audio_base_64: z.string().min(1),
    generated_voice_id: z.string().min(1),
    media_type: z.literal('audio/mpeg'),
    duration_secs: z.number().positive(),
    language: z.string().min(1),
  })).min(1),
})

export async function executeElevenLabsVoiceGeneration(input: AiProviderVoiceExecutionContext): Promise<GenerateResult> {
  const modelId = requireSelectedModelId(input.selection, 'elevenlabs:voice')
  if (modelId !== ELEVENLABS_VOICE_DESIGN_V3_MODEL_ID) {
    throw new AppError('INVALID_PARAMS', 'Unsupported ElevenLabs voice design model', { provider: 'elevenlabs' })
  }
  const { apiKey, baseUrl } = input.providerConfig
  if (!apiKey) throw new AppError('PROVIDER_AUTH_INVALID', undefined, { provider: 'elevenlabs' })
  // Language=Auto is the only canonical option. The API infers language from
  // these exact creative inputs; do not append or rewrite the description.
  const response = await fetchWithProviderProxy(
    `${buildElevenLabsUrl('/v1/text-to-voice/design', baseUrl)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({
        model_id: modelId,
        voice_description: input.description,
        text: input.text,
        auto_generate_text: false,
        stream_previews: false,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(180_000),
    },
  )
  if (!response.ok) return await throwElevenLabsHttpFailure(response)
  const payload = await readProviderJsonResponse({
    response, provider: 'elevenlabs', phase: 'submit', maxBytes: 24 * 1024 * 1024,
  })
  const parsed = voiceDesignResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new ProviderHttpError({
      provider: 'elevenlabs', phase: 'submit', statusCode: response.status,
      requestId: response.headers.get('request-id') ?? response.headers.get('x-request-id'),
      contentType: response.headers.get('content-type'),
      diagnosticText: 'ElevenLabs returned an invalid voice preview response',
      errorEnvelope: payload,
      cause: parsed.error,
    })
  }
  const result = parsed.data
  if (result.text !== input.text) {
    throw new AppError('GENERATION_FAILED', 'ElevenLabs changed the frozen voice preview text', { provider: 'elevenlabs' })
  }
  // The registered policy returns the first preview as one reference Resource.
  // The remaining provider candidates are not extra Tasks or extra charges.
  const preview = result.previews[0]
  const audio = decodeBase64WithLimit(preview.audio_base_64, 8 * 1024 * 1024, 'ElevenLabs voice preview')
  if (!audio.length) throw new AppError('GENERATION_FAILED', 'Empty ElevenLabs voice preview', { provider: 'elevenlabs' })
  const requestId = response.headers.get('request-id')?.trim() || response.headers.get('x-request-id')?.trim()
  return {
    success: true,
    audioBase64: audio.toString('base64'),
    audioMimeType: preview.media_type,
    ...(requestId ? { requestId } : {}),
    metadata: {
      generatedVoiceId: preview.generated_voice_id,
      language: preview.language,
      providerDurationSeconds: preview.duration_secs,
      providerPreviewCount: result.previews.length,
      previewSelection: 'first',
    },
  }
}
