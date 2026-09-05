import { falAdapter } from '@/lib/ai-providers/fal/adapter'
import { falAsyncTaskProvider } from '@/lib/ai-providers/fal/async-task'
import {
  FAL_API_CONFIG_CATALOG_MODELS,
  FAL_BUILTIN_CAPABILITY_CATALOG_ENTRIES,
  FAL_BUILTIN_PRICING_CATALOG_ENTRIES,
  FAL_PLATFORM_MODEL_PRESETS,
} from '@/lib/ai-providers/fal/models'
import { defineAiProviderManifest } from '@/lib/ai-providers/manifest'

const BOTH_TRANSPORTS = ['public-https', 'inline-data-url'] as const

export const falProviderManifest = defineAiProviderManifest({
  providerKey: 'fal',
  adapter: falAdapter,
  apiConfig: { visibility: 'hidden', name: 'FAL' },
  platformCredentials: { envPrefix: 'PLATFORM_FAL' },
  asyncTasks: [falAsyncTaskProvider],
  catalogs: {
    capabilities: FAL_BUILTIN_CAPABILITY_CATALOG_ENTRIES,
    pricing: FAL_BUILTIN_PRICING_CATALOG_ENTRIES,
    apiConfigModels: FAL_API_CONFIG_CATALOG_MODELS,
    platformModels: FAL_PLATFORM_MODEL_PRESETS,
  },
  mediaInputs: [
    { modality: 'image', transports: { image: BOTH_TRANSPORTS } },
    {
      modality: 'video',
      transports: { image: BOTH_TRANSPORTS, audio: BOTH_TRANSPORTS, video: BOTH_TRANSPORTS },
    },
  ],
})
