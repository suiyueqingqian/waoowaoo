import type { PlatformModelPreset } from '@/lib/platform-models/types'
import { AI_PROVIDER_MANIFESTS } from '@/lib/ai-providers/manifests'

export function listPlatformModelInputs(): readonly PlatformModelPreset[] {
  return AI_PROVIDER_MANIFESTS.flatMap((manifest) => (
    manifest.catalogs.platformModels.map((model) => ({ ...model }))
  ))
}
