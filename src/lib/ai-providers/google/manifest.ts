import { googleAdapter } from '@/lib/ai-providers/google/adapter'
import {
  geminiBatchAsyncTaskProvider,
  googleVideoAsyncTaskProvider,
} from '@/lib/ai-providers/google/async-task'
import {
  GOOGLE_API_CONFIG_CATALOG_MODELS,
  GOOGLE_BUILTIN_CAPABILITY_CATALOG_ENTRIES,
  GOOGLE_BUILTIN_PRICING_CATALOG_ENTRIES,
  GOOGLE_PLATFORM_MODEL_PRESETS,
} from '@/lib/ai-providers/google/models'
import { defineAiProviderManifest } from '@/lib/ai-providers/manifest'

const BOTH_TRANSPORTS = ['public-https', 'inline-data-url'] as const

export const googleProviderManifest = defineAiProviderManifest({
  providerKey: 'google',
  adapter: googleAdapter,
  apiConfig: { visibility: 'hidden', name: 'Google AI Studio' },
  platformCredentials: { envPrefix: 'PLATFORM_GOOGLE' },
  asyncTasks: [geminiBatchAsyncTaskProvider, googleVideoAsyncTaskProvider],
  catalogs: {
    capabilities: GOOGLE_BUILTIN_CAPABILITY_CATALOG_ENTRIES,
    pricing: GOOGLE_BUILTIN_PRICING_CATALOG_ENTRIES,
    apiConfigModels: GOOGLE_API_CONFIG_CATALOG_MODELS,
    platformModels: GOOGLE_PLATFORM_MODEL_PRESETS,
  },
  mediaInputs: [
    { modality: 'vision', transports: { image: BOTH_TRANSPORTS } },
    { modality: 'image', transports: { image: BOTH_TRANSPORTS } },
    { modality: 'video', transports: { image: BOTH_TRANSPORTS } },
  ],
})
