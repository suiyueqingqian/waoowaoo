import { openAiAdapter } from '@/lib/ai-providers/openai/adapter'
import {
  OPENAI_API_CONFIG_CATALOG_MODELS,
  OPENAI_BUILTIN_CAPABILITY_CATALOG_ENTRIES,
  OPENAI_BUILTIN_PRICING_CATALOG_ENTRIES,
} from '@/lib/ai-providers/openai/models'
import { defineAiProviderManifest } from '@/lib/ai-providers/manifest'

export const openAiProviderManifest = defineAiProviderManifest({
  providerKey: 'openai',
  adapter: openAiAdapter,
  catalogs: {
    capabilities: OPENAI_BUILTIN_CAPABILITY_CATALOG_ENTRIES,
    pricing: OPENAI_BUILTIN_PRICING_CATALOG_ENTRIES,
    apiConfigModels: OPENAI_API_CONFIG_CATALOG_MODELS,
    platformModels: [],
  },
})
