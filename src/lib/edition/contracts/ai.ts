import type {
  AiProviderManifest,
  AiProviderManifestExtension,
} from '@/lib/ai-providers/manifest'
import type { CapabilitySelections } from '@/lib/ai-registry/types'

export interface EditionAiContract {
  readonly readFixedParameters: () => CapabilitySelections
  readonly providerManifests: readonly AiProviderManifest[]
  readonly providerManifestExtensions: readonly AiProviderManifestExtension[]
  readonly apiConfig: {
    readonly featuredProviderKeys: readonly string[]
  }
}
