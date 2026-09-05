import { createAiSdkConnectionTester } from '@/lib/ai-providers/shared/connection-test'
import { OPENROUTER_DEFAULT_BASE_URL } from '@/lib/ai-providers/openrouter/config'
import { createOpenRouterLanguageModel } from './language-model'
import { OPENROUTER_PROVIDER_TEST_LLM_MODEL_ID } from './models'
import { openRouterFailureAdapter } from './error-normalization'

export const openRouterConnectionTester = createAiSdkConnectionTester({
  providerKey: 'openrouter',
  failure: openRouterFailureAdapter,
  displayName: 'OpenRouter',
  defaultBaseUrl: OPENROUTER_DEFAULT_BASE_URL,
  defaultTestModel: OPENROUTER_PROVIDER_TEST_LLM_MODEL_ID,
  protocol: 'openrouter-chat',
  createLanguageModel: createOpenRouterLanguageModel,
})
