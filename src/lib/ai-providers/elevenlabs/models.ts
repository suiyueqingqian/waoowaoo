import type { AiOptionSchema } from '@/lib/ai-registry/types'
import type { PlatformModelPreset } from '@/lib/platform-models/types'
import { usdToCredits } from '@/lib/ai-registry/pricing-currency'
import { buildMediaOptionSchema, enumValidator, type MediaModality } from '@/lib/ai-providers/shared/option-schema'
import { MUSIC_COMPOSITION_PLAN_LIMITS } from '@/lib/music/composition-plan'

export const ELEVENLABS_MUSIC_V2_MODEL_ID = 'music_v2'
export const ELEVENLABS_VOICE_DESIGN_V3_MODEL_ID = 'eleven_ttv_v3'

// Official Voice Design API infers language from the original description/text.
// https://elevenlabs.io/docs/api-reference/text-to-voice/design
export const ELEVENLABS_VOICE_DESIGN_CAPABILITIES = {
  languageOptions: ['Auto'],
  languageMode: 'inferred',
  descriptionMinChars: 20,
  descriptionMaxChars: 1_000,
  previewTextMinChars: 100,
  previewTextMaxChars: 1_000,
  previewSelection: 'first',
} as const

const ELEVENLABS_VOICE_DESIGN_MODEL = {
  provider: 'elevenlabs',
  modelId: ELEVENLABS_VOICE_DESIGN_V3_MODEL_ID,
  name: 'ElevenLabs Voice Design v3',
  type: 'voice',
} as const satisfies PlatformModelPreset

export const ELEVENLABS_PLATFORM_MODEL_PRESETS = [
  ELEVENLABS_VOICE_DESIGN_MODEL,
  {
    provider: 'elevenlabs',
    modelId: ELEVENLABS_MUSIC_V2_MODEL_ID,
    name: 'Eleven Music v2',
    type: 'music',
  },
] as const satisfies ReadonlyArray<PlatformModelPreset>

export const ELEVENLABS_BUILTIN_CAPABILITY_CATALOG_ENTRIES = [
  {
    modelType: 'voice',
    provider: 'elevenlabs',
    modelId: ELEVENLABS_VOICE_DESIGN_V3_MODEL_ID,
    capabilities: { voice: ELEVENLABS_VOICE_DESIGN_CAPABILITIES },
  },
  {
    modelType: 'music',
    provider: 'elevenlabs',
    modelId: ELEVENLABS_MUSIC_V2_MODEL_ID,
    capabilities: {
      music: {
        generationModes: ['composition_plan'],
        compositionPlan: {
          maxChunks: MUSIC_COMPOSITION_PLAN_LIMITS.maxChunks,
          minChunkDurationMs: MUSIC_COMPOSITION_PLAN_LIMITS.minChunkDurationMs,
          maxChunkDurationMs: MUSIC_COMPOSITION_PLAN_LIMITS.maxChunkDurationMs,
          minPlanDurationMs: MUSIC_COMPOSITION_PLAN_LIMITS.minPlanDurationMs,
          maxPlanDurationMs: MUSIC_COMPOSITION_PLAN_LIMITS.maxPlanDurationMs,
          maxPositiveStyles: MUSIC_COMPOSITION_PLAN_LIMITS.maxPositiveStyles,
          maxNegativeStyles: MUSIC_COMPOSITION_PLAN_LIMITS.maxNegativeStyles,
          contextAdherenceOptions: ['low', 'medium', 'high'],
        },
        outputFormatOptions: ['mp3'],
      },
    },
  },
] as const

export const ELEVENLABS_API_CONFIG_CATALOG_MODELS = [
  ELEVENLABS_VOICE_DESIGN_MODEL,
  {
    modelId: ELEVENLABS_MUSIC_V2_MODEL_ID,
    name: 'Eleven Music v2',
    type: 'music',
    provider: 'elevenlabs',
  },
] as const

/** Public API rates in canonical credits; billing units follow each modality. */
export const ELEVENLABS_BUILTIN_PRICING_CATALOG_ENTRIES = [
  {
    apiType: 'voice',
    provider: 'elevenlabs',
    modelId: ELEVENLABS_VOICE_DESIGN_V3_MODEL_ID,
    // Voice Design charges preview characters once, not once per returned candidate.
    // https://elevenlabs.io/docs/eleven-creative/voices/voice-design/
    // v3 public API price: https://elevenlabs.io/pricing/api ($0.10 / 1K characters).
    cost: { mode: 'flat' as const, flatAmount: usdToCredits(0.10 / 1_000) },
  },
  {
    apiType: 'music',
    provider: 'elevenlabs',
    modelId: ELEVENLABS_MUSIC_V2_MODEL_ID,
    // Official music API price: USD $0.15 per generated minute.
    cost: {
      mode: 'flat' as const,
      unit: 'per_second' as const,
      flatAmount: usdToCredits(0.15 / 60),
    },
  },
] as const

export function resolveElevenLabsOptionSchema(
  modality: MediaModality,
  modelId: string,
): AiOptionSchema {
  if (modality === 'voice' && modelId === ELEVENLABS_VOICE_DESIGN_V3_MODEL_ID) {
    return buildMediaOptionSchema('voice', {
      required: ['language'],
      validators: { language: enumValidator(ELEVENLABS_VOICE_DESIGN_CAPABILITIES.languageOptions) },
    })
  }
  if (modality !== 'music' || modelId !== ELEVENLABS_MUSIC_V2_MODEL_ID) {
    throw new Error(`ELEVENLABS_MODALITY_UNSUPPORTED:${modality}:${modelId}`)
  }
  return buildMediaOptionSchema('music', {
    excludedKeys: [
      'negativePrompt',
      'durationSeconds',
      'vocalMode',
      'genre',
      'mood',
      'bpm',
    ],
    validators: {
      outputFormat: enumValidator(['mp3']),
    },
    normalize: (options) => ({ ...options, outputFormat: options.outputFormat ?? 'mp3' }),
  })
}
