import { composeModelKey } from '@/lib/ai-registry/selection'
import { listPlatformModelInputs } from '@/lib/ai-registry/platform-models'
import type { StoredModel } from '@/lib/user-api/api-config-types'
import type { UnifiedModelType } from '@/lib/ai-registry/types'
import type { PlatformModelPreset } from './types'
import { MEDIA_MODEL_TYPES, resolveSingleModelSelection } from '@/lib/ai-registry/media-model-selection'

export const PLATFORM_DEFAULT_ASSISTANT_MODEL_ENV = 'PLATFORM_DEFAULT_ASSISTANT_MODEL'
/**
 * Each media variable selects zero or one model; the LLM variable is a list
 * from which the fixed Assistant model is selected. Registered type mismatches
 * and ambiguous media selections fail explicitly.
 */
export const PLATFORM_ENABLED_MODEL_ENV: Readonly<Record<UnifiedModelType, string>> = {
  llm: 'PLATFORM_ENABLED_LLM_MODELS',
  image: 'PLATFORM_ENABLED_IMAGE_MODELS',
  video: 'PLATFORM_ENABLED_VIDEO_MODELS',
  music: 'PLATFORM_ENABLED_MUSIC_MODELS',
  voice: 'PLATFORM_ENABLED_VOICE_MODELS',
}

const PLATFORM_POOL_MODEL_TYPES: readonly UnifiedModelType[] = ['llm', 'image', 'video', 'music', 'voice']

function toPlatformModel(input: PlatformModelPreset): StoredModel {
  return {
    modelId: input.modelId,
    modelKey: composeModelKey(input.provider, input.modelId),
    name: input.name,
    type: input.type,
    provider: input.provider,
    price: 0,
  }
}

/**
 * Everything the platform is able to offer: the provider manifests declare
 * these with credentials, pricing and capabilities registered. This is the
 * registry, not the pool.
 */
export function listPlatformCatalogModels(): StoredModel[] {
  return listPlatformModelInputs().map(toPlatformModel)
}

function parseModelKeyList(envName: string, raw: string | undefined): string[] {
  const keys = (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const duplicate = keys.find((key, index) => keys.indexOf(key) !== index)
  if (duplicate) {
    throw new Error(`PLATFORM_ENABLED_MODELS_DUPLICATE: ${envName}=${duplicate}`)
  }
  return keys
}

/**
 * Exactly the operator-configured models. Catalog membership does not enable
 * a model. Media categories are single-select; the LLM list must contain the
 * configured Assistant model.
 */
export function getPlatformEnabledModels(): StoredModel[] {
  const byKey = new Map(listPlatformCatalogModels().map((model) => [model.modelKey, model]))
  const enabled: StoredModel[] = []
  for (const type of PLATFORM_POOL_MODEL_TYPES) {
    const envName = PLATFORM_ENABLED_MODEL_ENV[type]
    for (const modelKey of parseModelKeyList(envName, process.env[envName])) {
      const model = byKey.get(modelKey)
      if (!model) {
        throw new Error(`PLATFORM_ENABLED_MODEL_NOT_FOUND: ${envName}=${modelKey}`)
      }
      if (model.type !== type) {
        throw new Error(`PLATFORM_ENABLED_MODEL_TYPE_INVALID: ${envName}=${modelKey} registered as ${model.type}`)
      }
      if (enabled.some((entry) => entry.modelKey === modelKey)) {
        throw new Error(`PLATFORM_ENABLED_MODELS_DUPLICATE: ${modelKey}`)
      }
      enabled.push(model)
    }
  }
  if (!enabled.some((model) => model.type === 'llm')) {
    throw new Error(`PLATFORM_ENABLED_MODELS_MISSING: ${PLATFORM_ENABLED_MODEL_ENV.llm}`)
  }
  for (const type of MEDIA_MODEL_TYPES) {
    if (resolveSingleModelSelection(enabled, type).status === 'ambiguous') {
      throw new Error(`PLATFORM_MEDIA_MODEL_SELECTION_AMBIGUOUS: ${PLATFORM_ENABLED_MODEL_ENV[type]} must contain at most one model`)
    }
  }
  return enabled
}

/**
 * The Assistant selection must be one of the enabled text models so the
 * Assistant is driven by a model the platform actually opens.
 */
export function getPlatformAssistantModelKey(): string {
  const raw = process.env[PLATFORM_DEFAULT_ASSISTANT_MODEL_ENV]
  const modelKey = typeof raw === 'string' ? raw.trim() : ''
  if (!modelKey) {
    throw new Error(`PLATFORM_DEFAULT_MODEL_ENV_MISSING: ${PLATFORM_DEFAULT_ASSISTANT_MODEL_ENV}`)
  }
  const model = getPlatformEnabledModels().find((candidate) => candidate.modelKey === modelKey)
  if (!model) {
    throw new Error(`PLATFORM_DEFAULT_MODEL_NOT_ENABLED: assistantModel=${modelKey}`)
  }
  if (model.type !== 'llm') {
    throw new Error(`PLATFORM_DEFAULT_MODEL_TYPE_INVALID: assistantModel=${modelKey} expected llm`)
  }
  return modelKey
}
