import { ApiError } from '@/lib/api-errors'
import type { StoredModel, StoredProvider } from '@/lib/user-api/api-config-types'
import { resolveProviderByIdOrKey } from '@/lib/user-api/api-config-provider-normalization'
import { isProductionModelSupported, MEDIA_MODEL_TYPES, resolveSingleModelSelection } from '@/lib/ai-registry/media-model-selection'
import { resolveBuiltinCapabilitiesByModelKey } from '@/lib/ai-registry/capabilities-catalog'

export function assertSingleMediaModelSelections(models: readonly StoredModel[]): void {
  for (const type of MEDIA_MODEL_TYPES) {
    const selection = resolveSingleModelSelection(models, type)
    if (selection.status === 'selected' && !isProductionModelSupported(
      type, resolveBuiltinCapabilitiesByModelKey(type, selection.model.modelKey),
    )) {
      throw new ApiError('INVALID_PARAMS', {
        code: 'MEDIA_GENERATION_OPTION_INVALID', field: 'models', modality: type,
        modelKey: selection.model.modelKey, reason: 'composition_plan_required',
      })
    }
    if (selection.status === 'ambiguous') {
      throw new ApiError('INVALID_PARAMS', {
        code: 'DEFAULT_MEDIA_MODEL_AMBIGUOUS',
        field: 'models',
        modality: type,
        modelKeys: [...selection.modelKeys],
        message: 'Select exactly one model for each media category in personal settings.',
      })
    }
  }
}

export function hasStoredProviderCredential(provider: StoredProvider): boolean {
  return typeof provider.apiKey === 'string' && provider.apiKey.trim().length > 0
}

export function filterEffectiveModels(
  models: readonly StoredModel[],
  providers: readonly StoredProvider[],
): StoredModel[] {
  return models.filter((model) => {
    const provider = resolveProviderByIdOrKey(providers, model.provider)
    if (!provider) {
      throw new ApiError('INVALID_PARAMS', {
        code: 'MODEL_PROVIDER_NOT_FOUND',
        field: 'customModels',
        modelKey: model.modelKey,
      })
    }
    return hasStoredProviderCredential(provider)
  })
}
