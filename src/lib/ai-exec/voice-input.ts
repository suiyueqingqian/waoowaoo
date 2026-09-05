import type { VoiceCapabilities } from '@/lib/ai-registry/types'
import { AiOptionValidationError } from './normalize'

export type VoiceGenerationTextInput = {
  readonly description: string
  readonly text: string
}

/** The same registry limits are checked before planning and before the submission fence. */
export function validateVoiceGenerationText(input: {
  readonly modelKey: string
  readonly capabilities: VoiceCapabilities | undefined
  readonly generation: VoiceGenerationTextInput | undefined
}): void {
  const fail = (field: string, reason: string): never => {
    throw new AiOptionValidationError({
      failure: 'invalid_option', context: `voice:${input.modelKey}`, field, reason,
    })
  }
  const capabilities = input.capabilities
  if (!capabilities) return fail('model', 'voice_capabilities_required')
  const generation = input.generation
  if (!generation) return fail('previewText', 'voice_input_required')
  for (const [field, value, min, max] of [
    ['description', generation.description, capabilities.descriptionMinChars, capabilities.descriptionMaxChars],
    ['previewText', generation.text, capabilities.previewTextMinChars, capabilities.previewTextMaxChars],
  ] as const) {
    if (!value.trim()) fail(field, 'required')
    const count = Array.from(value).length
    if (min !== undefined && count < min) fail(field, `min_chars_${min}`)
    if (max !== undefined && count > max) fail(field, `max_chars_${max}`)
  }
}
