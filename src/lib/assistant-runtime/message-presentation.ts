import type { UIMessage } from 'ai'
import type { AssistantRuntimeSessionTurnView } from './view-contract'

export type AssistantRuntimeTextPhase = 'commentary' | 'final_answer' | null

export type AssistantRuntimeMessageTurn = Pick<AssistantRuntimeSessionTurnView,
  'turnId' | 'attempt' | 'status' | 'assistantMessageId' | 'startedAt' | 'finishedAt' | 'createdAt'
>

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export function isAssistantRuntimePresentedMessage(message: UIMessage): boolean {
  return message.role !== 'assistant' || record(record(message.metadata)?.custom)?.waoAssistantPresentation === 1
}

export function parseAssistantRuntimeTextPhase(value: unknown): AssistantRuntimeTextPhase {
  if (value === undefined || value === null) return null
  if (value === 'commentary' || value === 'final_answer') return value
  throw new Error('ASSISTANT_RUNTIME_MESSAGE_PHASE_INVALID')
}

/** Native item identity and phase travel with the same durable prefix as text. */
export function assistantRuntimeTextMetadata(itemId: string, phase: AssistantRuntimeTextPhase) {
  return { wao: { itemId, phase } }
}

export function readAssistantRuntimeTextPresentation(part: UIMessage['parts'][number]): {
  readonly itemId: string
  readonly phase: AssistantRuntimeTextPhase
} | null {
  if (part.type !== 'text' && part.type !== 'reasoning') return null
  const metadata = record(part.providerMetadata?.wao)
  if (!metadata) throw new Error('ASSISTANT_RUNTIME_MESSAGE_PRESENTATION_REQUIRED')
  if (typeof metadata.itemId !== 'string' || !metadata.itemId) {
    throw new Error('ASSISTANT_RUNTIME_MESSAGE_ITEM_ID_INVALID')
  }
  return { itemId: metadata.itemId, phase: parseAssistantRuntimeTextPhase(metadata.phase) }
}

export function readAssistantRuntimeMessageTurnId(message: UIMessage): string | null {
  const custom = record(record(message.metadata)?.custom)
  return typeof custom?.waoAgentTurnId === 'string' ? custom.waoAgentTurnId : null
}

export function readAssistantRuntimeMessageAttempt(message: UIMessage): number | null {
  const custom = record(record(message.metadata)?.custom)
  return typeof custom?.waoAgentTurnAttempt === 'number' ? custom.waoAgentTurnAttempt : null
}

/** Read projection only: Turn remains the sole persisted lifecycle owner. */
export function withAssistantRuntimeMessageTurn(message: UIMessage, turn: AssistantRuntimeMessageTurn): UIMessage {
  const metadata = record(message.metadata)
  const ownerId = readAssistantRuntimeMessageTurnId(message)
  if (ownerId !== turn.turnId) throw new Error('ASSISTANT_RUNTIME_MESSAGE_TURN_DIVERGED')
  return {
    ...message,
    metadata: {
      ...metadata,
      custom: {
        ...record(metadata?.custom),
        waoAgentTurnId: turn.turnId,
        waoAgentTurnView: turn,
      },
    },
  }
}

export function readAssistantRuntimeMessageTurn(message: UIMessage): AssistantRuntimeMessageTurn | null {
  const value = record(record(record(message.metadata)?.custom)?.waoAgentTurnView)
  if (!value) return null
  const status = value.status
  if (
    typeof value.turnId !== 'string' || !Number.isSafeInteger(value.attempt)
    || (status !== 'queued' && status !== 'running' && status !== 'waiting_approval'
      && status !== 'completed' && status !== 'failed' && status !== 'interrupted' && status !== 'cancelled')
    || (value.assistantMessageId !== null && typeof value.assistantMessageId !== 'string')
    || (value.startedAt !== null && typeof value.startedAt !== 'string')
    || (value.finishedAt !== null && typeof value.finishedAt !== 'string')
    || typeof value.createdAt !== 'string'
  ) throw new Error('ASSISTANT_RUNTIME_MESSAGE_TURN_VIEW_INVALID')
  return value as AssistantRuntimeMessageTurn
}
