// Exact IDs/context: https://docs.volcengine.com/docs/82379/1799865
// Wire reasoning options: https://docs.volcengine.com/docs/82379/1449737
// CNY per million tokens: https://docs.volcengine.com/docs/82379/1544106
// The latest recommended Seed batch plus the latest GLM/DeepSeek GA families.
// Older length-tiered Seed models are not represented by a cheapest-band price.
const doubaoReasoning = {
  reasoningEffortOptions: ['minimal', 'low', 'medium', 'high'],
  defaultReasoningEffort: 'medium',
} as const

const deepseekReasoning = {
  reasoningEffortOptions: ['none', 'low', 'high', 'max'],
  defaultReasoningEffort: 'high',
} as const

// Display distinct effective levels, not every accepted wire alias. Ark maps
// Doubao none -> minimal and xhigh/max -> high; GLM low/medium -> high and
// xhigh -> max; DeepSeek GA medium -> low and xhigh -> high. GLM/DeepSeek
// minimal also disables reasoning, so only none represents that state.
export const ARK_LLM_MODELS = [
  { modelId: 'doubao-seed-evolving', name: 'Doubao Seed Evolving', contextWindow: 1_048_576, publicReasoningMode: 'summary_auto', inputCost: 6, outputCost: 30, ...doubaoReasoning },
  { modelId: 'doubao-seed-2-1-pro-260628', name: 'Doubao Seed 2.1 Pro', contextWindow: 262_144, publicReasoningMode: 'summary_auto', inputCost: 6, outputCost: 30, ...doubaoReasoning },
  { modelId: 'doubao-seed-2-1-turbo-260628', name: 'Doubao Seed 2.1 Turbo', contextWindow: 262_144, publicReasoningMode: 'summary_auto', inputCost: 3, outputCost: 15, ...doubaoReasoning },
  { modelId: 'glm-5-2-260617', name: 'GLM 5.2', contextWindow: 1_048_576, publicReasoningMode: 'native', inputCost: 8, outputCost: 28, reasoningEffortOptions: ['none', 'high', 'max'], defaultReasoningEffort: 'high' },
  { modelId: 'deepseek-v4-pro-ga-260813', name: 'DeepSeek V4 Pro', contextWindow: 1_048_576, publicReasoningMode: 'native', inputCost: 9, outputCost: 27, ...deepseekReasoning },
  { modelId: 'deepseek-v4-flash-ga-260731', name: 'DeepSeek V4 Flash', contextWindow: 1_048_576, publicReasoningMode: 'native', inputCost: 3, outputCost: 9, ...deepseekReasoning },
] as const

export const ARK_PROVIDER_TEST_LLM_MODEL_ID = 'doubao-seed-2-1-turbo-260628'
