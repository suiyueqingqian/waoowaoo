interface PreferenceRecord {
  assistantModel?: string | null
}

interface DeploymentRecord {
  providerCredentialMode?: string | null
  usesPlatformProviderKeys?: boolean | null
}

interface RuntimeDefaultsRecord {
  assistantModel?: string | null
}

interface UserPreferencePayload {
  preference?: PreferenceRecord | null
  deployment?: DeploymentRecord | null
  runtimeDefaults?: RuntimeDefaultsRecord | null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function hasConfiguredAssistantModel(payload: unknown): boolean {
  return readConfiguredAssistantModel(payload) !== null
}

export function readConfiguredAssistantModel(payload: unknown): string | null {
  if (!isObjectLike(payload)) return null

  const preferenceValue = payload.preference
  if (isObjectLike(preferenceValue)) {
    const preference = preferenceValue as PreferenceRecord
    if (isNonEmptyString(preference.assistantModel)) return preference.assistantModel.trim()
  }

  if (!usesPlatformProviderKeys(payload)) return null

  const runtimeDefaultsValue = payload.runtimeDefaults
  if (!isObjectLike(runtimeDefaultsValue)) return null

  const runtimeDefaults = runtimeDefaultsValue as RuntimeDefaultsRecord
  return isNonEmptyString(runtimeDefaults.assistantModel) ? runtimeDefaults.assistantModel.trim() : null
}

export function usesPlatformProviderKeys(payload: unknown): boolean {
  if (!isObjectLike(payload)) return false

  const deploymentValue = payload.deployment
  if (!isObjectLike(deploymentValue)) return false

  const deployment = deploymentValue as DeploymentRecord
  if (deployment.usesPlatformProviderKeys === true) return true
  return deployment.providerCredentialMode === 'platform-key'
}

export function shouldGuideToModelSetup(payload: unknown): boolean {
  if (usesPlatformProviderKeys(payload)) return false
  return !hasConfiguredAssistantModel(payload)
}

export type { UserPreferencePayload }
