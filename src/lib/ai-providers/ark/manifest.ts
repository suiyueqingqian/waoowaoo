import { arkAdapter } from '@/lib/ai-providers/ark/adapter'
import { arkAsyncTaskProvider } from '@/lib/ai-providers/ark/async-task'
import {
  ARK_API_CONFIG_CATALOG_MODELS,
  ARK_BUILTIN_CAPABILITY_CATALOG_ENTRIES,
  ARK_PLATFORM_MODEL_PRESETS,
} from '@/lib/ai-providers/ark/models'
import { ARK_BUILTIN_PRICING_CATALOG_ENTRIES } from '@/lib/ai-providers/ark/pricing'
import { defineAiProviderManifest } from '@/lib/ai-providers/manifest'
import { ARK_DEFAULT_BASE_URL } from '@/lib/ai-providers/ark/config'

const BOTH_TRANSPORTS = ['public-https', 'inline-data-url'] as const
const PUBLIC_HTTPS_ONLY = ['public-https'] as const

export const arkProviderManifest = defineAiProviderManifest({
  providerKey: 'ark',
  adapter: arkAdapter,
  apiConfig: {
    visibility: 'hidden',
    name: 'Volcengine Ark',
    baseUrl: ARK_DEFAULT_BASE_URL,
  },
  platformCredentials: { envPrefix: 'PLATFORM_ARK' },
  asyncTasks: [arkAsyncTaskProvider],
  catalogs: {
    capabilities: ARK_BUILTIN_CAPABILITY_CATALOG_ENTRIES,
    pricing: ARK_BUILTIN_PRICING_CATALOG_ENTRIES,
    apiConfigModels: ARK_API_CONFIG_CATALOG_MODELS,
    platformModels: ARK_PLATFORM_MODEL_PRESETS,
  },
  mediaInputs: [
    { modality: 'vision', transports: { image: BOTH_TRANSPORTS } },
    { modality: 'image', transports: { image: BOTH_TRANSPORTS } },
    {
      modality: 'video',
      transports: { image: BOTH_TRANSPORTS, audio: BOTH_TRANSPORTS, video: PUBLIC_HTTPS_ONLY },
    },
  ],
})
