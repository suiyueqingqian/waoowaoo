import { getCapabilityOptionFields } from './capabilities-catalog'
import type { CapabilityValue, ModelCapabilities, UnifiedModelType } from './types'

/** Application-owned parameter policy; providers supply the allowed values. */
export const FIXABLE_CAPABILITY_FIELDS = {
  llm: ['reasoningEffort'],
  image: ['resolution', 'quality'],
  video: ['resolution', 'generateAudio'],
  music: [],
  voice: [],
} as const satisfies Record<UnifiedModelType, readonly string[]>

export interface FixedParameterField {
  readonly field: string
  readonly options: readonly CapabilityValue[]
  readonly allowUnset: boolean
  readonly defaultValue?: CapabilityValue
}

export type FixedParameterFieldsByModel = Record<string, readonly FixedParameterField[]>

export function getFixedParameterFields(
  modelType: UnifiedModelType,
  capabilities: ModelCapabilities | undefined,
): FixedParameterField[] {
  const options = getCapabilityOptionFields(modelType, capabilities)
  return FIXABLE_CAPABILITY_FIELDS[modelType].flatMap((field): FixedParameterField[] => {
    if (!options[field]?.length) return []
    if (modelType === 'llm') {
      const defaultValue = capabilities?.llm?.defaultReasoningEffort
      if (defaultValue === undefined || !options[field].includes(defaultValue)) {
        throw new Error('LLM_DEFAULT_REASONING_EFFORT_REQUIRED')
      }
      return [{ field, options: options[field], allowUnset: false, defaultValue }]
    }
    return [{ field, options: options[field], allowUnset: true }]
  })
}
