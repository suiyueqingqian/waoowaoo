import { ApiError } from '@/lib/api-errors'
import { parseModelKeyStrict } from '@/lib/ai-registry/selection'
import { resolveBuiltinModelContext, validateCapabilitySelectionsPayload } from '@/lib/ai-registry/capabilities-catalog'
import { getFixedParameterFields } from '@/lib/ai-registry/fixed-parameters'
import type { CapabilitySelections } from '@/lib/ai-registry/types'
import type { StoredModel } from './api-config-types'
import { CAPABILITY_MODEL_TYPES } from './api-config-types'
import { isRecord } from './api-config-shared'

export function normalizeCapabilitySelectionsInput(
  raw: unknown,
): CapabilitySelections {
  if (raw === undefined || raw === null) return {}
  if (!isRecord(raw)) {
    throw new ApiError('INVALID_PARAMS', {
      code: 'CAPABILITY_SELECTION_INVALID',
      field: 'capabilityDefaults',
    })
  }

  const normalized: CapabilitySelections = {}
  for (const [modelKey, rawSelection] of Object.entries(raw)) {
    if (!isRecord(rawSelection)) {
      throw new ApiError('INVALID_PARAMS', {
        code: 'CAPABILITY_SELECTION_INVALID',
        field: `capabilityDefaults.${modelKey}`,
      })
    }

    const selection: Record<string, string | number | boolean> = {}
    for (const [field, value] of Object.entries(rawSelection)) {
      if (field === 'aspectRatio') {
        throw new ApiError('INVALID_PARAMS', {
          code: 'CAPABILITY_FIELD_INVALID',
          field: `capabilityDefaults.${modelKey}.${field}`,
        })
      }
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        throw new ApiError('INVALID_PARAMS', {
          code: 'CAPABILITY_SELECTION_INVALID',
          field: `capabilityDefaults.${modelKey}.${field}`,
        })
      }
      selection[field] = value
    }

    if (Object.keys(selection).length > 0) {
      normalized[modelKey] = selection
    }
  }

  return normalized
}

export function parseStoredCapabilitySelections(raw: string | null | undefined, field: string): CapabilitySelections {
  if (!raw) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ApiError('INVALID_PARAMS', {
      code: 'CAPABILITY_SELECTION_INVALID',
      field,
    })
  }

  return normalizeCapabilitySelectionsInput(parsed)
}

export function serializeCapabilitySelections(selections: CapabilitySelections): string | null {
  if (Object.keys(selections).length === 0) return null
  return JSON.stringify(selections)
}

function buildStoredModelMap(models: StoredModel[]): Map<string, StoredModel> {
  const modelMap = new Map<string, StoredModel>()
  for (const model of models) {
    modelMap.set(model.modelKey, model)
  }
  return modelMap
}

function resolveCapabilityContextForModelKey(
  modelMap: Map<string, StoredModel>,
  modelKey: string,
) {
  const model = modelMap.get(modelKey)
  if (model) {
    return resolveBuiltinModelContext(model.type, model.modelKey) || null
  }

  if (!parseModelKeyStrict(modelKey)) return null
  for (const modelType of CAPABILITY_MODEL_TYPES) {
    const context = resolveBuiltinModelContext(modelType, modelKey)
    if (context) return context
  }
  return null
}

export function validateCapabilitySelectionsAgainstModels(
  selections: CapabilitySelections,
  models: StoredModel[],
) {
  const modelMap = buildStoredModelMap(models)
  for (const [modelKey, selection] of Object.entries(selections)) {
    const context = resolveCapabilityContextForModelKey(modelMap, modelKey)
    if (!context) continue
    const fixedFields = new Set(getFixedParameterFields(context.modelType, context.capabilities).map(({ field }) => field))
    for (const field of Object.keys(selection)) {
      if (!fixedFields.has(field)) {
        throw new ApiError('INVALID_PARAMS', { code: 'CAPABILITY_FIELD_INVALID', field: `capabilityDefaults.${modelKey}.${field}` })
      }
    }
  }
  const issues = validateCapabilitySelectionsPayload(
    selections,
    (modelKey) => resolveCapabilityContextForModelKey(modelMap, modelKey),
  )

  if (issues.length > 0) {
    const firstIssue = issues[0]
    throw new ApiError('INVALID_PARAMS', {
      code: firstIssue.code,
      field: firstIssue.field,
      allowedValues: firstIssue.allowedValues,
    })
  }
}
