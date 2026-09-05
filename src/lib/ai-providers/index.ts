import { AiRegistry } from '@/lib/ai-registry/registry'
import type {
  AsyncExternalIdProvider,
  AsyncTaskProviderRegistration,
} from '@/lib/ai-providers/async-task-types'
import { AI_PROVIDER_MANIFESTS } from '@/lib/ai-providers/manifests'
import type { AiProviderAdapter, AiProviderLanguageModelContext } from '@/lib/ai-providers/runtime-types'
import type {
  AiProviderLanguageModelRequestContext,
  AiProviderLanguageModelValidationContext,
} from '@/lib/ai-providers/runtime-types'
import type { AiLlmExecutionResult, AiLlmMessage } from '@/lib/ai-registry/types'
import type { ModelMessage } from 'ai'
import { flattenChatMessageContent } from '@/lib/ai-registry/message-content'
import {
  assertProviderFailureAdapterIdentity,
  runCapturedProviderOperation,
} from '@/lib/ai-providers/failure'
import type { AiProviderFailurePhase } from '@/lib/ai-providers/runtime-types'
import type { ExternalOperationId } from '@/lib/external-operation/registry'
import {
  resolveRegisteredLlmProtocol,
  resolveRegisteredPublicReasoningMode,
} from '@/lib/ai-registry/llm-protocol'

const runtimeProviderRegistry = new AiRegistry<AiProviderAdapter>(
  AI_PROVIDER_MANIFESTS.map((manifest) => manifest.adapter),
)

for (const adapter of runtimeProviderRegistry.getAdapters()) {
  assertProviderFailureAdapterIdentity(adapter.providerKey, adapter.failure)
}

const asyncTaskProviderRegistry: AsyncTaskProviderRegistration[] = AI_PROVIDER_MANIFESTS.flatMap(
  (manifest) => manifest.asyncTasks ?? [],
)

for (const registration of asyncTaskProviderRegistry) {
  resolveAiProviderAdapter(registration.providerKey)
}

export function resolveAsyncTaskProviderByExternalId(externalId: string): AsyncTaskProviderRegistration {
  const registration = asyncTaskProviderRegistry.find((candidate) => candidate.canParseExternalId(externalId))
  if (!registration) {
    const supportedProviderCodes = asyncTaskProviderRegistry
      .map((candidate) => candidate.providerCode)
      .join(', ')
    throw new Error(
      `无法识别的 externalId 格式: "${externalId}". ` +
      `已注册的异步 Provider: ${supportedProviderCodes}`,
    )
  }
  return registration
}

export function resolveAsyncTaskProviderByCode(providerCode: AsyncExternalIdProvider): AsyncTaskProviderRegistration {
  const registration = asyncTaskProviderRegistry.find((candidate) => candidate.providerCode === providerCode)
  if (!registration) {
    throw new Error(`未知的 Provider: ${providerCode}`)
  }
  return registration
}

export function listRegisteredAsyncTaskProviders(): readonly AsyncTaskProviderRegistration[] {
  return [...asyncTaskProviderRegistry]
}

export function resolveAiProviderAdapter(providerId: string): AiProviderAdapter {
  return runtimeProviderRegistry.getAdapterByProviderId(providerId)
}

export function tryResolveAiProviderAdapter(providerId: string): AiProviderAdapter | null {
  return runtimeProviderRegistry.tryGetAdapterByProviderId(providerId)
}

export function listRegisteredAiProviderAdapters(): readonly AiProviderAdapter[] {
  return runtimeProviderRegistry.getAdapters()
}

export async function runRegisteredProviderOperation<T>(input: {
  readonly providerId: string
  readonly phase: AiProviderFailurePhase
  readonly operation?: ExternalOperationId
  readonly run: () => Promise<T>
}): Promise<T> {
  const adapter = resolveAiProviderAdapter(input.providerId)
  return await runCapturedProviderOperation({
    adapter: adapter.failure,
    phase: input.phase,
    operation: input.operation,
    run: input.run,
  })
}

export function createRegisteredLanguageModel(input: AiProviderLanguageModelRequestContext) {
  const languageModelProvider = resolveAiProviderAdapter(input.selection.provider).languageModel
  if (!languageModelProvider) {
    throw new Error(`AI_PROVIDER_MODALITY_UNSUPPORTED:${input.selection.provider}:languageModel`)
  }
  const context: AiProviderLanguageModelContext = {
    ...input,
    protocol: resolveRegisteredLlmProtocol(input.selection.modelKey),
    publicReasoningMode: resolveRegisteredPublicReasoningMode(input.selection.modelKey),
  }
  return languageModelProvider.create(context)
}

function defaultTextModelMessages(messages: AiLlmMessage[]): ModelMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: flattenChatMessageContent(message.content),
  }))
}

export function prepareRegisteredTextModelMessages(
  providerId: string,
  messages: AiLlmMessage[],
): ModelMessage[] {
  const languageModelProvider = resolveAiProviderAdapter(providerId).languageModel
  if (!languageModelProvider) {
    throw new Error(`AI_PROVIDER_MODALITY_UNSUPPORTED:${providerId}:languageModel`)
  }
  return languageModelProvider.prepareTextMessages?.(messages) ?? defaultTextModelMessages(messages)
}

export function validateRegisteredLanguageModelResult(
  providerId: string,
  result: AiLlmExecutionResult,
  context: AiProviderLanguageModelValidationContext,
): void {
  const languageModelProvider = resolveAiProviderAdapter(providerId).languageModel
  if (!languageModelProvider) {
    throw new Error(`AI_PROVIDER_MODALITY_UNSUPPORTED:${providerId}:languageModel`)
  }
  languageModelProvider.validateResult?.(result, context)
}
