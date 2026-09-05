import { ensureAiCatalogsRegistered } from '@/lib/ai-exec/catalog-bootstrap'
import { listApiConfigCatalogModels } from '@/lib/ai-registry/api-config-catalog'
import {
  composeModelKey,
  getProviderKey,
  parseModelKeyStrict,
} from '@/lib/ai-registry/selection'

let publicModelNameByKey: ReadonlyMap<string, string> | null = null

function getPublicModelNameByKey(): ReadonlyMap<string, string> {
  if (publicModelNameByKey) return publicModelNameByKey
  ensureAiCatalogsRegistered()
  publicModelNameByKey = new Map(
    listApiConfigCatalogModels().map((model) => [
      composeModelKey(model.provider, model.modelId),
      model.name,
    ]),
  )
  return publicModelNameByKey
}

/**
 * Projects an internal provider-qualified model identity into a public model
 * label. Routing identities stay in persistence; user-facing Views never
 * receive the provider portion of `provider::modelId`.
 */
export function resolvePublicModelName(
  modelKey: string | null | undefined,
): string | null {
  const value = modelKey?.trim()
  if (!value) return null

  const parsed = parseModelKeyStrict(value)
  if (!parsed) return value

  const namesByKey = getPublicModelNameByKey()
  const exactName = namesByKey.get(parsed.modelKey)
  if (exactName) return exactName

  const providerKey = getProviderKey(parsed.provider).toLowerCase()
  const builtinName = namesByKey.get(
    composeModelKey(providerKey, parsed.modelId),
  )
  return builtinName ?? parsed.modelId
}
