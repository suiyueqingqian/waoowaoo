import { AI_PROVIDER_MANIFESTS } from '@/lib/ai-providers/manifests'

interface PlatformProviderEnvDeclaration {
  readonly envPrefix: string
  readonly requiresBaseUrl: boolean
}

const declarations: Record<string, PlatformProviderEnvDeclaration> = {}

for (const manifest of AI_PROVIDER_MANIFESTS) {
  if (!manifest.platformCredentials) continue
  declarations[manifest.providerKey] = {
    envPrefix: manifest.platformCredentials.envPrefix,
    requiresBaseUrl: manifest.platformCredentials.requiresBaseUrl === true,
  }
}

process.stdout.write(JSON.stringify(declarations))
