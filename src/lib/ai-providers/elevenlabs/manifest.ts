import { elevenLabsAdapter } from '@/lib/ai-providers/elevenlabs/adapter'
import {
  ELEVENLABS_API_CONFIG_CATALOG_MODELS,
  ELEVENLABS_BUILTIN_CAPABILITY_CATALOG_ENTRIES,
  ELEVENLABS_BUILTIN_PRICING_CATALOG_ENTRIES,
  ELEVENLABS_PLATFORM_MODEL_PRESETS,
} from '@/lib/ai-providers/elevenlabs/models'
import { defineAiProviderManifest } from '@/lib/ai-providers/manifest'

export const elevenLabsProviderManifest = defineAiProviderManifest({
  providerKey: 'elevenlabs',
  adapter: elevenLabsAdapter,
  apiConfig: {
    visibility: 'hidden',
    name: 'ElevenLabs',
    baseUrl: 'https://api.elevenlabs.io',
  },
  platformCredentials: { envPrefix: 'PLATFORM_ELEVENLABS' },
  catalogs: {
    capabilities: ELEVENLABS_BUILTIN_CAPABILITY_CATALOG_ENTRIES,
    pricing: ELEVENLABS_BUILTIN_PRICING_CATALOG_ENTRIES,
    apiConfigModels: ELEVENLABS_API_CONFIG_CATALOG_MODELS,
    platformModels: ELEVENLABS_PLATFORM_MODEL_PRESETS,
  },
})
