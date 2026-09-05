import { usdToCredits } from '@/lib/ai-registry/pricing-currency'
import { SEEDANCE_2_5_RETAIL_CREDITS_PER_SECOND } from '@/lib/ai-providers/shared/seedance-pricing'
import {
  OPENROUTER_HAILUO_3_MAX_REFERENCE_IMAGES,
  OPENROUTER_HAILUO_3_MAX_VIDEO_MODEL_ID,
  OPENROUTER_HAILUO_3_VIDEO_MODEL_ID,
  OPENROUTER_HAILUO_DURATION_OPTIONS,
  OPENROUTER_SEEDANCE_2_5_OUTPUTS,
  OPENROUTER_SEEDANCE_2_5_VIDEO_MODEL_ID,
} from './video-models'

// OpenRouter video_tokens SKU: USD 0.0000107/token, audio on or off.
// Native token formula: width * height * 24 * output_seconds / 1024.
// Reference-video pricing also counts input video; it must not match these
// output-only tiers. No adaptive-size or intelligent-duration approximation.
const tiers = OPENROUTER_SEEDANCE_2_5_OUTPUTS.map(({ resolution, aspectRatio, width, height }) => ({
  when: { resolution, aspectRatio, containsVideoInput: false },
  amount: usdToCredits(width * height * 24 / 1024 * 0.0000107),
  retail: SEEDANCE_2_5_RETAIL_CREDITS_PER_SECOND[resolution],
}))

export const OPENROUTER_SEEDANCE_2_5_PRICING = {
  apiType: 'video', provider: 'openrouter', modelId: OPENROUTER_SEEDANCE_2_5_VIDEO_MODEL_ID,
  cost: { mode: 'capability', unit: 'per_second', tiers: tiers.map(({ when, amount }) => ({ when, amount })) },
  retail: { mode: 'capability', unit: 'per_second', tiers: tiers.map(({ when, retail }) => ({ when, amount: retail })) },
} as const

// OpenRouter H3: USD 0.13/output second plus USD 0.04/image after the first five.
// Frame modes are mutually exclusive with references and contain at most two
// images, so their images never cross the free threshold. Freeze the entire
// request price rather than multiplying the image surcharge by video duration.
export const OPENROUTER_HAILUO_PRICING_CATALOG_ENTRIES = [
  {
    apiType: 'video', provider: 'openrouter', modelId: OPENROUTER_HAILUO_3_VIDEO_MODEL_ID,
    cost: {
      mode: 'capability', unit: 'per_call',
      tiers: OPENROUTER_HAILUO_DURATION_OPTIONS.flatMap((duration) => Array.from({
        length: OPENROUTER_HAILUO_3_MAX_REFERENCE_IMAGES + 1,
      }, (_, referenceImageCount) => ({
        when: { resolution: '2K', duration, referenceImageCount, containsVideoInput: false },
        amount: usdToCredits(duration * 0.13 + Math.max(referenceImageCount - 5, 0) * 0.04),
      }))),
    },
  },
  {
    apiType: 'video', provider: 'openrouter', modelId: OPENROUTER_HAILUO_3_MAX_VIDEO_MODEL_ID,
    cost: {
      mode: 'capability', unit: 'per_second',
      tiers: [
        { when: { resolution: '480p', containsVideoInput: false }, amount: usdToCredits(0.05) },
        { when: { resolution: '768p', containsVideoInput: false }, amount: usdToCredits(0.08) },
      ],
    },
  },
] as const
