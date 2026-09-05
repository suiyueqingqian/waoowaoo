/**
 * Seedance retail prices, in credits per second of output.
 *
 * Seedance is reachable through multiple providers, and what each of them charges
 * us differs. What the user pays must not: the same model at the same
 * resolution is one product with one price, so every registered provider
 * catalog imports these rates instead of deriving retail from its own cost.
 *
 * The rates are set against the most expensive route we actually bill through,
 * so every registered route clears the margin floor.
 */
export const SEEDANCE_2_RETAIL_CREDITS_PER_SECOND = {
  standard: { '480p': 9, '720p': 19, '1080p': 44 },
  fast: { '480p': 7, '720p': 15 },
} as const

// Product retail rates, not provider cost estimates. Provider cost tiers retain
// the exact aspect ratio and exclude unpriced reference-video input.
export const SEEDANCE_2_5_RETAIL_CREDITS_PER_SECOND = {
  '480p': 14,
  '720p': 31,
  '1080p': 68,
} as const

// Index is the number of reference images in the frozen provider input.
// One product price is shared by Ark and OpenRouter despite different input
// image charges. 1.5K is Ark-only and has the same base cost class as 1K.
export const SEEDREAM_5_PRO_RETAIL_CREDITS_PER_IMAGE = {
  '1K': [7, 7, 8, 8, 9, 9, 10, 10, 10, 11, 11, 12, 12, 13, 13],
  '1.5K': [7, 7, 8, 8, 9, 9, 10, 10, 10, 11, 11, 12, 12, 13, 13],
  '2K': [13, 14, 14, 15, 15, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20],
} as const
