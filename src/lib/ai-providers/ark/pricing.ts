import {
  SEEDANCE_2_RETAIL_CREDITS_PER_SECOND,
  SEEDANCE_2_5_RETAIL_CREDITS_PER_SECOND,
  SEEDREAM_5_PRO_RETAIL_CREDITS_PER_IMAGE,
} from '@/lib/ai-providers/shared/seedance-pricing'
import { ARK_LLM_MODELS } from './llm-models'

function arkFlatPricing(flatAmount: number) {
  return { mode: 'flat' as const, flatAmount }
}

function arkCapabilityPricing(
  tiers: ReadonlyArray<{ when: Record<string, string | number | boolean>; amount: number }>,
  unit?: 'per_call' | 'per_second',
) {
  return { mode: 'capability' as const, ...(unit ? { unit } : {}), tiers }
}

function arkTokenPricing(input: number, output: number) {
  return arkCapabilityPricing([
    { when: { tokenType: 'input' }, amount: input },
    { when: { tokenType: 'output' }, amount: output },
  ])
}

// Existing Seedance 2.0 price points are retained in this scoped change.
const SEEDANCE_2_COST_PER_SECOND_CNY = {
  standard: { '480p': 0.4621, '720p': 0.9936 },
  fast: { '480p': 0.3717, '720p': 0.7992 },
} as const

function arkResolutionPricing(tiers: ReadonlyArray<readonly [resolution: string, amount: number]>) {
  return arkCapabilityPricing(tiers.map(([resolution, amount]) => ({
    when: { resolution },
    amount,
  })), 'per_second')
}

function arkResolutionAudioPricing(
  tiers: ReadonlyArray<readonly [resolution: string, generateAudio: boolean, amount: number]>,
) {
  return arkCapabilityPricing(tiers.map(([resolution, generateAudio, amount]) => ({
    when: { resolution, generateAudio },
    amount,
  })), 'per_second')
}

// Published output pixels: https://docs.volcengine.com/docs/82379/1520757
// List CNY/M tokens: https://docs.volcengine.com/docs/82379/1544106
// No video-reference or adaptive tier: neither has frozen output pixels/input
// duration expressible by this per-output-second catalog. Never use 16:9 as an
// approximation for another ratio, or bake a temporary promotion into base cost.
const seedance25PricePoints = [
  {
    resolution: '480p', tokenRate: 70,
    dimensions: { '16:9': [854, 480], '4:3': [752, 560], '1:1': [640, 640], '3:4': [560, 752], '9:16': [480, 854], '21:9': [992, 432] },
  },
  {
    resolution: '720p', tokenRate: 70,
    dimensions: { '16:9': [1280, 720], '4:3': [1112, 834], '1:1': [960, 960], '3:4': [834, 1112], '9:16': [720, 1280], '21:9': [1470, 630] },
  },
  {
    resolution: '1080p', tokenRate: 77,
    dimensions: { '16:9': [1920, 1080], '4:3': [1664, 1248], '1:1': [1440, 1440], '3:4': [1248, 1664], '9:16': [1080, 1920], '21:9': [2206, 946] },
  },
] as const

const seedance25Tiers = seedance25PricePoints.flatMap(({ resolution, tokenRate, dimensions }) => (
  Object.entries(dimensions).map(([aspectRatio, [width, height]]) => ({
    when: { resolution, aspectRatio, containsVideoInput: false, containsFirstFrame: false },
    cost: width * height * 24 * tokenRate / (1024 * 1_000_000),
    retail: SEEDANCE_2_5_RETAIL_CREDITS_PER_SECOND[resolution],
  }))
))

// Single image only; <=2.61MP is the 1K/1.5K band. Explicit schema sizes keep
// the requested pixels in the quoted band. The first reference is free.
const seedream5ProTiers = (['1K', '1.5K', '2K'] as const).flatMap((resolution) => (
  Array.from({ length: 11 }, (_, referenceImageCount) => ({
    when: { resolution, referenceImageCount },
    cost: ((resolution === '2K' ? 60 : 30) + Math.max(0, referenceImageCount - 1) * 2) / 100,
    retail: SEEDREAM_5_PRO_RETAIL_CREDITS_PER_IMAGE[resolution][referenceImageCount],
  }))
))

export const ARK_BUILTIN_PRICING_CATALOG_ENTRIES = [
  ...ARK_LLM_MODELS.map((model) => ({
    apiType: 'text' as const, provider: 'ark', modelId: model.modelId,
    cost: arkTokenPricing(model.inputCost, model.outputCost),
  })),
  {
    apiType: 'video', provider: 'ark', modelId: 'doubao-seedance-2-5-260628',
    cost: arkCapabilityPricing(seedance25Tiers.map(({ when, cost }) => ({ when, amount: cost })), 'per_second'),
    retail: arkCapabilityPricing(seedance25Tiers.map(({ when, retail }) => ({ when, amount: retail })), 'per_second'),
  },
  {
    apiType: 'image', provider: 'ark', modelId: 'doubao-seedream-5-0-pro-260628',
    cost: arkCapabilityPricing(seedream5ProTiers.map(({ when, cost }) => ({ when, amount: cost })), 'per_call'),
    retail: arkCapabilityPricing(seedream5ProTiers.map(({ when, retail }) => ({ when, amount: retail })), 'per_call'),
  },
  { apiType: 'text', provider: 'ark', modelId: 'doubao-seed-1-8-251228', cost: arkTokenPricing(0.8, 2) },
  { apiType: 'text', provider: 'ark', modelId: 'doubao-seed-2-0-pro-260215', cost: arkTokenPricing(3.2, 16) },
  { apiType: 'text', provider: 'ark', modelId: 'doubao-seed-2-0-lite-260215', cost: arkTokenPricing(0.6, 3.6) },
  { apiType: 'text', provider: 'ark', modelId: 'doubao-seed-2-0-mini-260215', cost: arkTokenPricing(0.2, 2) },
  { apiType: 'text', provider: 'ark', modelId: 'doubao-seed-1-6-251015', cost: arkTokenPricing(0.8, 2) },
  { apiType: 'text', provider: 'ark', modelId: 'doubao-seed-1-6-lite-251015', cost: arkTokenPricing(0.3, 0.6) },
  { apiType: 'image', provider: 'ark', modelId: 'doubao-seedream-5-0-260128', cost: arkFlatPricing(0.22), retail: arkFlatPricing(15) },
  { apiType: 'image', provider: 'ark', modelId: 'doubao-seedream-4-5-251128', cost: arkFlatPricing(0.25), retail: arkFlatPricing(11) },
  { apiType: 'image', provider: 'ark', modelId: 'doubao-seedream-4-0-250828', cost: arkFlatPricing(0.2), retail: arkFlatPricing(9) },
  {
    apiType: 'video',
    provider: 'ark',
    modelId: 'doubao-seedance-2-0-260128',
    cost: arkResolutionPricing([
      ['480p', SEEDANCE_2_COST_PER_SECOND_CNY.standard['480p']],
      ['720p', SEEDANCE_2_COST_PER_SECOND_CNY.standard['720p']],
    ]),
    retail: arkResolutionPricing([['480p', SEEDANCE_2_RETAIL_CREDITS_PER_SECOND.standard['480p']], ['720p', SEEDANCE_2_RETAIL_CREDITS_PER_SECOND.standard['720p']]]),
  },
  {
    apiType: 'video',
    provider: 'ark',
    modelId: 'doubao-seedance-2-0-fast-260128',
    cost: arkResolutionPricing([
      ['480p', SEEDANCE_2_COST_PER_SECOND_CNY.fast['480p']],
      ['720p', SEEDANCE_2_COST_PER_SECOND_CNY.fast['720p']],
    ]),
    retail: arkResolutionPricing([['480p', SEEDANCE_2_RETAIL_CREDITS_PER_SECOND.fast['480p']], ['720p', SEEDANCE_2_RETAIL_CREDITS_PER_SECOND.fast['720p']]]),
  },
  { apiType: 'video', provider: 'ark', modelId: 'doubao-seedance-1-0-pro-fast-251015', cost: arkResolutionPricing([['480p', 0.2], ['720p', 0.43], ['1080p', 1.03]]) },
  { apiType: 'video', provider: 'ark', modelId: 'doubao-seedance-1-0-pro-fast-251015-batch', cost: arkResolutionPricing([['480p', 0.1], ['720p', 0.22], ['1080p', 0.51]]) },
  {
    apiType: 'video',
    provider: 'ark',
    modelId: 'doubao-seedance-1-5-pro-251215',
    cost: arkResolutionAudioPricing([
      ['480p', true, 0.8],
      ['720p', true, 1.73],
      ['1080p', true, 3.89],
      ['480p', false, 0.4],
      ['720p', false, 0.86],
      ['1080p', false, 1.94],
    ]),
  },
  {
    apiType: 'video',
    provider: 'ark',
    modelId: 'doubao-seedance-1-5-pro-251215-batch',
    cost: arkResolutionAudioPricing([
      ['480p', true, 0.4],
      ['720p', true, 0.86],
      ['1080p', true, 1.94],
      ['480p', false, 0.2],
      ['720p', false, 0.43],
      ['1080p', false, 0.97],
    ]),
  },
  { apiType: 'video', provider: 'ark', modelId: 'doubao-seedance-1-0-pro-250528', cost: arkResolutionPricing([['480p', 0.73], ['720p', 1.54], ['1080p', 3.67]]) },
  { apiType: 'video', provider: 'ark', modelId: 'doubao-seedance-1-0-pro-250528-batch', cost: arkResolutionPricing([['480p', 0.36], ['720p', 0.77], ['1080p', 1.84]]) },
  { apiType: 'video', provider: 'ark', modelId: 'doubao-seedance-1-0-lite-i2v-250428', cost: arkResolutionPricing([['480p', 0.49], ['720p', 1.03], ['1080p', 2.45]]) },
  { apiType: 'video', provider: 'ark', modelId: 'doubao-seedance-1-0-lite-i2v-250428-batch', cost: arkResolutionPricing([['480p', 0.24], ['720p', 0.51], ['1080p', 1.22]]) },
] as const
