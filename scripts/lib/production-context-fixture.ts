import { ensureAiCatalogsRegistered } from '@/lib/ai-exec/catalog-bootstrap'
import { listBuiltinCapabilityCatalog } from '@/lib/ai-registry/capabilities-catalog'
import { projectProductionCapabilities, type ProjectProductionContext } from '@/lib/project-production-context'

/** Registry-derived scope for offline protocol probes; never used for billing or execution. */
export function productionContextFixture(): ProjectProductionContext {
  ensureAiCatalogsRegistered()
  const catalog = listBuiltinCapabilityCatalog()
  const models = [
    'openrouter::openai/gpt-image-2',
    'fal::bytedance/seedance-2.0',
    'elevenlabs::music_v2',
    'fal::fal-ai/qwen-3-tts/voice-design/1.7b',
  ].map(modelKey => {
    const entry = catalog.find(entry => `${entry.provider}::${entry.modelId}` === modelKey)
    if (!entry) throw new Error(`PROBE_MODEL_NOT_REGISTERED:${modelKey}`)
    return { modelId: entry.modelId, modelKey, name: entry.modelId, type: entry.modelType, provider: entry.provider, price: 0 }
  })
  return {
    schemaVersion: 8,
    version: 'offline-registry-probe',
    fixedParameters: {},
    project: {
      projectId: 'smoke-project', name: 'Offline protocol probe', description: null,
      videoRatio: '16:9', videoResolution: '1080p', imageResolution: '2K',
    },
    productionCapabilities: projectProductionCapabilities({
      videoRatio: '16:9',
      models,
    }),
  }
}
