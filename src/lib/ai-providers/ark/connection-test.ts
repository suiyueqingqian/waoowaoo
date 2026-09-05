import { createAiSdkConnectionTester } from '@/lib/ai-providers/shared/connection-test'
import { createAiProviderFailureAdapter } from '@/lib/ai-providers/failure'
import { ARK_DEFAULT_BASE_URL } from '@/lib/ai-providers/ark/config'
import { createArkLanguageModel } from './language-model'
import { ARK_PROVIDER_TEST_LLM_MODEL_ID } from './llm-models'

export const arkFailureAdapter = createAiProviderFailureAdapter('ark')

export const arkConnectionTester = createAiSdkConnectionTester({
  providerKey: 'ark',
  failure: arkFailureAdapter,
  displayName: 'Ark',
  defaultBaseUrl: ARK_DEFAULT_BASE_URL,
  defaultTestModel: ARK_PROVIDER_TEST_LLM_MODEL_ID,
  protocol: 'openai-responses',
  createLanguageModel: createArkLanguageModel,
})
