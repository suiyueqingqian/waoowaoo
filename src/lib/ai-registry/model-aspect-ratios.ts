import { resolveAiProviderAdapter } from '@/lib/ai-providers'
import { ASPECT_RATIO_CONFIGS } from '@/lib/constants'
import { parseModelKeyStrict } from './selection'

/** Same field validator used by media preflight; no second ratio catalog. */
export function modelAspectRatios(modelKey: string, modality: 'image' | 'video'): readonly string[] {
  const parsed = parseModelKeyStrict(modelKey)
  if (!parsed) throw new Error(`MODEL_KEY_INVALID:${modelKey}`)
  const adapter = resolveAiProviderAdapter(parsed.provider)[modality]
  if (!adapter) throw new Error(`AI_PROVIDER_MODALITY_UNSUPPORTED:${parsed.provider}:${modality}`)
  const schema = adapter.describe({ ...parsed, modelKey, variantSubKind: 'official' }).optionSchema
  if (!schema.allowedKeys.has('aspectRatio')) return []
  const validator = schema.validators.aspectRatio
  return Object.keys(ASPECT_RATIO_CONFIGS).filter((ratio) => !validator || validator(ratio).ok)
}
