import { usdToCredits } from '@/lib/ai-registry/pricing-currency'
import { SEEDREAM_5_PRO_RETAIL_CREDITS_PER_IMAGE } from '@/lib/ai-providers/shared/seedance-pricing'

// OpenRouter Images API, not the Ark API's different resolution/ref limits.
// https://openrouter.ai/api/v1/images/models/bytedance-seed/seedream-5-0-pro/endpoints
export const OPENROUTER_SEEDREAM_5_PRO_MODEL_ID = 'bytedance-seed/seedream-5-0-pro'
export const OPENROUTER_SEEDREAM_5_PRO_RESOLUTIONS = ['1K', '2K'] as const
export const OPENROUTER_SEEDREAM_5_PRO_RATIOS = [
  '1:1', '1:2', '2:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4',
  '9:16', '16:9', '9:19.5', '19.5:9', '9:20', '20:9', '9:21', '21:9', 'auto',
] as const
export const OPENROUTER_SEEDREAM_5_PRO_MAX_REFERENCES = 14

const tiers = OPENROUTER_SEEDREAM_5_PRO_RESOLUTIONS.flatMap((resolution) => (
  Array.from({ length: OPENROUTER_SEEDREAM_5_PRO_MAX_REFERENCES + 1 }, (_, referenceImageCount) => ({
    when: { resolution, referenceImageCount },
    // Every reference image is billable on OpenRouter, including the first.
    amount: usdToCredits((resolution === '1K' ? 0.045 : 0.09) + referenceImageCount * 0.003),
    retail: SEEDREAM_5_PRO_RETAIL_CREDITS_PER_IMAGE[resolution][referenceImageCount],
  }))
))

export const OPENROUTER_SEEDREAM_5_PRO_PRICING = {
  apiType: 'image', provider: 'openrouter', modelId: OPENROUTER_SEEDREAM_5_PRO_MODEL_ID,
  cost: { mode: 'capability', tiers: tiers.map(({ when, amount }) => ({ when, amount })) },
  retail: { mode: 'capability', tiers: tiers.map(({ when, retail }) => ({ when, amount: retail })) },
} as const
