import { resolveAiProviderAdapter } from '@/lib/ai-providers'
import { describe, expect, it } from 'vitest'
import { isProductionModelSupported } from '@/lib/ai-registry/media-model-selection'
import { listApiConfigCatalogModels } from '@/lib/ai-registry/api-config-catalog'
import { ensureAiCatalogsRegistered } from '@/lib/ai-exec/catalog-bootstrap'
import {
  getCapabilityOptionFields,
  listBuiltinCapabilityCatalog,
  resolveGenerationOptionsForModel,
} from '@/lib/ai-registry/capabilities-catalog'
import { getFixedParameterFields } from '@/lib/ai-registry/fixed-parameters'
import { projectProductionCapabilities, type ProjectProductionContext } from '@/lib/project-production-context'
import { createProjectAgentOperationRegistry } from '@/lib/operations/registry'
import { projectProductionToolInputSchema } from '@/lib/operations/production-tool-schema'
import type { JsonObject, JsonValue } from '@/lib/operations/types'

ensureAiCatalogsRegistered()

function object(value: JsonValue | undefined): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function propertiesWithField(value: JsonValue, field: string): JsonObject[] {
  if (Array.isArray(value)) return value.flatMap(child => propertiesWithField(child, field))
  if (!object(value)) return []
  const own = object(value.properties) && field in value.properties ? [value.properties] : []
  return [...own, ...Object.values(value).flatMap(child => propertiesWithField(child, field))]
}

const catalog = listBuiltinCapabilityCatalog()
function contextFor(
  entries: Array<Pick<typeof catalog[number], 'modelId' | 'provider' | 'modelType'>>,
  videoRatio: string | null = '16:9',
): ProjectProductionContext {
  return {
    schemaVersion: 8,
    version: 'registry-conformance',
    fixedParameters: {},
    project: {
      projectId: 'registry-conformance', name: 'Registry', description: null,
      videoRatio, videoResolution: '1080p', imageResolution: '2K',
    },
    productionCapabilities: projectProductionCapabilities({
      videoRatio,
      models: entries.map(entry => ({
        modelId: entry.modelId, modelKey: `${entry.provider}::${entry.modelId}`,
        name: entry.modelId, type: entry.modelType, provider: entry.provider, price: 0,
      })),
    }),
  }
}

describe('Production parameter registry conformance', () => {
  const registry = createProjectAgentOperationRegistry()

  it('publishes every selectable video model and preserves item ratios without a project ratio', () => {
    const original = propertiesWithField(registry.create_video.toolInputSchema.properties, 'durationSeconds')
    for (const selected of listApiConfigCatalogModels().filter((entry) => entry.type === 'video')) {
      const context = contextFor([{ ...selected, modelType: selected.type }], null)
      const models = context.productionCapabilities.video.models
      expect(models, selected.modelId).toHaveLength(1)
      const model = models[0]
      expect(model.supportedInputModes.length, selected.modelId).toBeGreaterThan(0)
      expect(model.allowedSegmentDurationsSeconds.length, selected.modelId).toBeGreaterThan(0)
      const schema = projectProductionToolInputSchema(registry.create_video, {
        ...context,
        fixedParameters: { [model.model]: Object.fromEntries(model.parameters.map(({ field, options }) => [field, options[0]])) },
      })
      expect(schema, selected.modelId).not.toBeNull()
      const branches = propertiesWithField(schema!.properties, 'durationSeconds')
      expect(branches).toHaveLength(original.length)
      const native = resolveAiProviderAdapter(selected.provider).video!.describe({
        provider: selected.provider, modelId: selected.modelId, modelKey: model.model, variantSubKind: 'official',
      }).optionSchema
      for (const branch of branches) {
        const ratio = object(branch.options) && object(branch.options.properties) ? branch.options.properties.aspectRatio : null
        expect(object(ratio) && Array.isArray(ratio.enum) && ratio.enum.length > 0).toBe(true)
        if (object(ratio) && Array.isArray(ratio.enum)) for (const value of ratio.enum) {
          expect(native.validators.aspectRatio?.(value).ok ?? true, `${model.model}:${String(value)}`).toBe(true)
        }
      }
    }
  })

  it('accounts for every image/video option without implicit quality choices', () => {
    for (const entry of catalog.filter((entry) => entry.modelType === 'image' || entry.modelType === 'video')) {
      const modelKey = `${entry.provider}::${entry.modelId}`
      const fields = getCapabilityOptionFields(entry.modelType, entry.capabilities)
      const fixedFields = getFixedParameterFields(entry.modelType, entry.capabilities)
      const accountedFields = new Set([
        ...fixedFields.map(({ field }) => field),
        ...(entry.modelType === 'video' ? ['duration', 'generationMode'] : []),
      ])
      expect(Object.keys(fields).every((field) => accountedFields.has(field)), modelKey).toBe(true)
      const valid = Object.fromEntries(Object.entries(fields).map(([field, values]) => [field, values[0]]))
      for (const { field, options } of fixedFields) {
        const remaining = { ...valid }
        delete remaining[field]
        const missing = resolveGenerationOptionsForModel({
          ...entry, modelKey, runtimeSelections: remaining,
        })
        expect(missing.issues.some((issue) => issue.code === 'CAPABILITY_REQUIRED' && issue.field.endsWith(`.${field}`)), `${modelKey}.${field}`).toBe(true)
        for (const value of options) {
          const resolved = resolveGenerationOptionsForModel({
            ...entry, modelKey, runtimeSelections: remaining,
            capabilityDefaults: { [modelKey]: { [field]: value } },
          })
          expect(resolved.issues, `${modelKey}.${field}=${value}`).toEqual([])
          expect(resolved.options[field]).toBe(value)
        }
      }
    }
  })

  it('projects each configured registry model without allowing Agent model selection', () => {
    for (const operation of Object.values(registry)) {
      if (operation.resourceContract.kind !== 'resource') continue
      const generation = operation.resourceContract.alternativeGeneration
      if (generation) expect(operation.productionModality, operation.id).toBe(generation.mediaKind)
    }
    for (const operation of Object.values(registry).filter(entry => entry.productionModality)) {
      const modality = operation.productionModality!
      expect(projectProductionToolInputSchema(operation, contextFor([]))).toBeNull()
      for (const entry of catalog.filter(entry => entry.modelType === modality)) {
        if (!isProductionModelSupported(entry.modelType, entry.capabilities)) {
          expect(() => contextFor([entry])).toThrow()
          continue
        }
        const context = contextFor([entry])
        const capabilities = context.productionCapabilities
        const models = modality === 'video' ? capabilities.video.models : capabilities[modality]
        const schema = projectProductionToolInputSchema(operation, context)
        // Not every registered music model supports the Composition Plan workflow.
        if (!models.length) {
          expect(schema).toBeNull()
          continue
        }
        expect(schema, operation.id).not.toBeNull()
        expect(propertiesWithField(schema!.properties, 'model')).toEqual([])
        const field = modality === 'voice' ? 'previewText' : modality === 'music' ? 'compositionPlan' : 'prompt'
        const branches = propertiesWithField(schema!.properties, field)
        expect(branches.length, `${operation.id}:${entry.modelId}`).toBeGreaterThan(0)
        const model = models[0]
        if ('parameters' in model) for (const { field: option, options } of model.parameters) {
          for (const branch of branches) {
            expect(object(branch.options) && object(branch.options.properties) && branch.options.properties[option])
              .toEqual({ type: typeof options[0], enum: options })
          }
          for (const value of options) {
            const fixed = projectProductionToolInputSchema(operation, {
              ...context, fixedParameters: { [model.model]: { [option]: value } },
            })!
            for (const branch of propertiesWithField(fixed.properties, field)) {
              if (object(branch.options) && object(branch.options.properties)) expect(branch.options.properties[option]).toBeUndefined()
              else expect(branch.options).toBeUndefined()
            }
          }
        }
        if ('allowedSegmentDurationsSeconds' in model) for (const branch of branches) {
          expect(object(branch.durationSeconds) && branch.durationSeconds.enum).toEqual(model.allowedSegmentDurationsSeconds)
        }
        if ('languageOptions' in model) for (const branch of branches) {
          expect(object(branch.language) && branch.language.enum).toEqual(entry.capabilities?.voice?.languageOptions)
          if (entry.capabilities?.voice?.previewTextMinChars !== undefined) {
            expect(object(branch.previewText) && branch.previewText.minLength).toBe(entry.capabilities?.voice.previewTextMinChars)
            expect(object(branch.previewText) && branch.previewText.maxLength).toBe(entry.capabilities?.voice.previewTextMaxChars)
          }
        }
      }
    }
  })

  it('rejects ambiguous media selections instead of selecting by list order', () => {
    for (const modality of ['image', 'video', 'music', 'voice'] as const) {
      const entries = catalog.filter(entry => entry.modelType === modality).slice(0, 2)
      if (entries.length < 2) continue
      expect(() => contextFor(entries)).toThrow()
      expect(() => contextFor([...entries].reverse())).toThrow()
    }
  })
})
