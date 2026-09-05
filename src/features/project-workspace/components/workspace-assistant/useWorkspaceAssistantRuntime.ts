'use client'

import type { CanvasGenerationIntent } from '@/lib/workspace-resource/canvas-generation-intent'

import {
  readUIMessageStream,
  type UIMessage,
  type UIMessageChunk,
} from 'ai'
import {
  useExternalStoreRuntime,
  type AppendMessage,
  type AssistantRuntime,
  type ThreadMessageLike,
} from '@assistant-ui/react'
import { useLocale } from 'next-intl'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useAgentSessionView } from '@/lib/query/hooks'
import {
  isAssistantRuntimeApprovalRequest,
  isAssistantRuntimeInputRequest,
  type AgentSessionPendingInteractionView,
  type AgentSessionView,
} from '@/lib/assistant-runtime/view-contract'
import { apiFetch } from '@/lib/api-fetch'
import {
  buildProjectAssistantTextAttachmentMetadata,
  type ProjectAssistantTextAttachment,
} from '@/lib/project-agent/text-attachments'
import {
  buildProjectAssistantMediaAttachmentMetadata,
  mergeProjectAssistantMessageMetadata,
  type ProjectAssistantMediaAttachment,
} from '@/lib/project-agent/media-attachments'
import { WORKSPACE_SSE_EVENT_TYPE, type AgentTurnStreamSSEEvent } from '@/lib/sse/events'
import { useWorkspaceProvider } from '../../WorkspaceProvider'
import {
  clearWorkspaceAssistantUserMessageReceipt,
  resolveWorkspaceAssistantUserMessageId,
} from './workspace-assistant-command-receipt'
import { createClientApiError, parseClientError } from '@/lib/errors/client'
import {
  assistantRuntimeTextMetadata,
  readAssistantRuntimeTextPresentation,
  readAssistantRuntimeMessageTurnId,
  readAssistantRuntimeMessageAttempt,
  withAssistantRuntimeMessageTurn,
  type AssistantRuntimeTextPhase,
} from '@/lib/assistant-runtime/message-presentation'
import { createWorkspaceAssistantMessageProjector } from './workspace-assistant-message-projection'

export interface WorkspaceAssistantSendMessageInput {
  readonly canvasGenerationIntent?: CanvasGenerationIntent
  readonly expectedProductionConfigurationVersion?: string
  readonly text: string
  readonly attachments?: readonly ProjectAssistantTextAttachment[]
  readonly mediaAttachments?: readonly ProjectAssistantMediaAttachment[]
  readonly sourceKey?: string
}

interface UseWorkspaceAssistantRuntimeParams {
  projectId: string
  selectedScopeRef?: string | null
  selectedAssetId?: string | null
}

interface UseWorkspaceAssistantRuntimeResult {
  runtime: AssistantRuntime
  messages: UIMessage[]
  pending: boolean
  canStopReply: boolean
  replyInFlight: boolean
  backgroundFollowUpActive: boolean
  hasRunningMessage: boolean
  view: AgentSessionView | null
  pendingInteraction: AgentSessionPendingInteractionView | null
  error: Error | undefined
  viewError: string | null
  viewLoading: boolean
  sendMessage: (input: WorkspaceAssistantSendMessageInput) => Promise<void>
  sendHiddenMessage: (text: string, sourceKey?: string) => Promise<void>
  stopReply: () => Promise<void>
  submitInteractionResponse: (params: { response: Record<string, unknown> }) => Promise<void>
  resolveApproval: (params: {
    decision: 'approve' | 'reject'
  }) => Promise<void>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

const identityMessage = (message: ThreadMessageLike): ThreadMessageLike => message

class WorkspaceAssistantCommandError extends Error {
  readonly outcome: 'rejected' | 'unconfirmed'

  constructor(code: string, requestId: string | null, outcome: 'rejected' | 'unconfirmed') {
    super(JSON.stringify({ error: { code, details: requestId ? { requestId } : {} } }))
    this.name = 'WorkspaceAssistantCommandError'
    this.outcome = outcome
  }
}

async function readCommandError(
  response: Response,
  fallback: string,
): Promise<WorkspaceAssistantCommandError> {
  const payload: unknown = await response.json().catch(() => null)
  const outcome = response.status >= 500 ? 'unconfirmed' : 'rejected'
  const parsed = createClientApiError(payload, response.status, response.headers.get('x-request-id'))
  return new WorkspaceAssistantCommandError(parsed.code ?? fallback, parsed.requestId, outcome)
}

function normalizeWorkspaceAssistantCommandError(error: unknown): {
  error: Error
  outcome: 'rejected' | 'unconfirmed'
} {
  if (error instanceof WorkspaceAssistantCommandError) {
    return { error, outcome: error.outcome }
  }
  return {
    error: new WorkspaceAssistantCommandError('PROJECT_AGENT_RUNTIME_FAILED', null, 'unconfirmed'),
    outcome: 'unconfirmed',
  }
}

function createUserMessage(params: {
  id: string
  text: string
  attachments: readonly ProjectAssistantTextAttachment[]
  mediaAttachments: readonly ProjectAssistantMediaAttachment[]
  hidden: boolean
}): UIMessage {
  const metadata = mergeProjectAssistantMessageMetadata(
    buildProjectAssistantTextAttachmentMetadata(params.attachments),
    buildProjectAssistantMediaAttachmentMetadata(params.mediaAttachments),
  )
  const metadataRecord: Record<string, unknown> = isRecord(metadata) ? metadata : {}
  const custom = {
    ...(isRecord(metadataRecord.custom) ? metadataRecord.custom : {}),
    ...(params.hidden ? { workspaceAssistantHidden: true } : {}),
  }
  return {
    id: params.id,
    role: 'user',
    parts: params.text ? [{ type: 'text', text: params.text }] : [],
    metadata: {
      ...metadataRecord,
      custom,
    },
  }
}

function readAppendMessageText(message: AppendMessage): string {
  return message.content
    .flatMap((part) => (part.type === 'text' ? [part.text] : []))
    .join('\n')
    .trim()
}

function isActiveTurn(view: AgentSessionView | null): boolean {
  return (
    view?.currentTurn?.status === 'queued' ||
    view?.currentTurn?.status === 'running' ||
    view?.currentTurn?.status === 'waiting_approval'
  )
}

function readDecidedInteractionResult(
  interaction: AgentSessionPendingInteractionView,
): Record<string, unknown> | null {
  if (interaction.status !== 'decided' || !isRecord(interaction.response)) return null
  return isRecord(interaction.response.result) ? interaction.response.result : null
}

function readPersistedAgentTurnStreamSeq(message: UIMessage | undefined): number {
  if (!message || !isRecord(message.metadata)) return 0
  const custom = message.metadata.custom
  if (!isRecord(custom)) return 0
  const seq = custom.waoAgentTurnStreamSeq
  return Number.isSafeInteger(seq) && Number(seq) >= 0 ? Number(seq) : 0
}

function readTurnStreamSeq(messages: readonly UIMessage[], turnId: string, attempt: number): number {
  return messages.reduce((seq, candidate) =>
    readAssistantRuntimeMessageTurnId(candidate) === turnId
      && readAssistantRuntimeMessageAttempt(candidate) === attempt
      ? Math.max(seq, readPersistedAgentTurnStreamSeq(candidate)) : seq, 0)
}

type AgentTurnOverlayController = {
  identity: string
  turnId: string
  attempt: number
  lastSeq: number
  controller: ReadableStreamDefaultController<UIMessageChunk>
  activeTextParts: Set<string>
  activeReasoningParts: Set<string>
  textPhases: Map<string, AssistantRuntimeTextPhase>
}

function enqueueAgentTurnOverlayChunk(
  active: AgentTurnOverlayController,
  chunk: UIMessageChunk,
): void {
  if (
    (chunk.type === 'text-delta' || chunk.type === 'text-end')
    && !active.activeTextParts.has(chunk.id)
  ) {
    active.controller.enqueue({ type: 'text-start', id: chunk.id,
      providerMetadata: assistantRuntimeTextMetadata(chunk.id, active.textPhases.get(chunk.id) ?? null),
    })
    active.activeTextParts.add(chunk.id)
  } else if (chunk.type === 'text-start') {
    active.activeTextParts.add(chunk.id)
  }
  if (
    (chunk.type === 'reasoning-delta' || chunk.type === 'reasoning-end')
    && !active.activeReasoningParts.has(chunk.id)
  ) {
    active.controller.enqueue({ type: 'reasoning-start', id: chunk.id,
      providerMetadata: assistantRuntimeTextMetadata(chunk.id, null),
    })
    active.activeReasoningParts.add(chunk.id)
  } else if (chunk.type === 'reasoning-start') {
    active.activeReasoningParts.add(chunk.id)
  }
  active.controller.enqueue(chunk)
  if (chunk.type === 'text-end') active.activeTextParts.delete(chunk.id)
  if (chunk.type === 'reasoning-end') active.activeReasoningParts.delete(chunk.id)
}

function useAgentTurnOverlay(params: {
  projectId: string
  view: AgentSessionView | null
}): UIMessage | null {
  const { subscribeTaskEvents } = useWorkspaceProvider()
  const [message, setMessage] = useState<UIMessage | null>(null)
  const activeRef = useRef<AgentTurnOverlayController | null>(null)
  const generationRef = useRef(0)

  const close = useCallback(() => {
    generationRef.current += 1
    const active = activeRef.current
    activeRef.current = null
    if (active) {
      try {
        active.controller.close()
      } catch {}
    }
    setMessage(null)
  }, [])

  const start = useCallback(
    (event: AgentTurnStreamSSEEvent, prefixSeq: number) => {
      close()
      const generation = generationRef.current
      const durableMessage = params.view?.thread?.messages.find(
        (candidate) => candidate.id === event.messageId,
      )
      // The SDK mutates its seed in place. Keep Query's immutable history and
      // its projection cache isolated from the live stream's working buffer.
      const persistedMessage = durableMessage ? structuredClone(durableMessage) : undefined
      let controller: ReadableStreamDefaultController<UIMessageChunk> | null = null
      const stream = new ReadableStream<UIMessageChunk>({
        start(nextController) {
          controller = nextController
        },
      })
      if (!controller) {
        throw new Error('AGENT_TURN_OVERLAY_CONTROLLER_MISSING')
      }
      activeRef.current = {
        identity: `${event.turnId}:${String(event.attempt)}:${event.messageId}`,
        turnId: event.turnId,
        attempt: event.attempt,
        // The persisted prefix and its watermark are one durable fact. SSE
        // bootstrap buffers newer stream events, so duplicates are skipped
        // and a real gap fails closed below instead of truncating the reply.
        lastSeq: prefixSeq,
        controller,
        activeTextParts: new Set(),
        activeReasoningParts: new Set(),
        textPhases: new Map((persistedMessage?.parts ?? []).flatMap((part) => {
          const presentation = readAssistantRuntimeTextPresentation(part)
          return presentation ? [[presentation.itemId, presentation.phase] as const] : []
        })),
      }
      void (async () => {
        try {
          let renderedSeq = prefixSeq
          for await (const nextMessage of readUIMessageStream({
            stream,
            terminateOnError: true,
            message: {
              id: event.messageId,
              role: 'assistant',
              parts: persistedMessage?.parts ?? [],
              metadata: {
                ...(isRecord(persistedMessage?.metadata) ? persistedMessage.metadata : {}),
                custom: {
                  ...(isRecord(persistedMessage?.metadata) && isRecord(persistedMessage.metadata.custom) ? persistedMessage.metadata.custom : {}),
                  waoAssistantPresentation: 1,
                  waoAgentTurnId: event.turnId,
                  waoAgentTurnAttempt: event.attempt,
                  waoAgentTurnStreamSeq: prefixSeq,
                },
              },
            },
          })) {
            if (generationRef.current !== generation) return
            // Render only after the SDK has consumed the event and its fence.
            // Synthetic text-start chunks must not advance the durable prefix.
            const seq = readPersistedAgentTurnStreamSeq(nextMessage)
            if (seq <= renderedSeq) continue
            renderedSeq = seq
            setMessage(nextMessage)
          }
        } catch {
          if (generationRef.current === generation) close()
        }
      })()
    },
    [close, params.view?.thread?.messages],
  )

  useEffect(
    () =>
      subscribeTaskEvents((event) => {
        if (event.type !== WORKSPACE_SSE_EVENT_TYPE.AGENT_TURN_STREAM) return
        if (event.projectId !== params.projectId) {
          return
        }
        const currentTurn = params.view?.currentTurn
        if (!currentTurn || event.turnId !== currentTurn.turnId || event.attempt !== currentTurn.attempt
          || (currentTurn.status !== 'running' && currentTurn.status !== 'waiting_approval')) return
        // Sequence belongs to the Turn attempt, including all steer segments.
        const durableSeq = readTurnStreamSeq(params.view?.thread?.messages ?? [], event.turnId, event.attempt)
        const previous = activeRef.current
        const activeSeq = previous?.turnId === event.turnId && previous.attempt === event.attempt ? previous.lastSeq : 0
        const prefixSeq = Math.max(durableSeq, activeSeq)
        if (event.seq <= prefixSeq) return
        if (event.seq !== prefixSeq + 1) {
          close()
          return
        }
        const identity = `${event.turnId}:${String(event.attempt)}:${event.messageId}`
        // Rebase from the durable message when it overtakes the live reader.
        if (previous?.identity !== identity || durableSeq > activeSeq) start(event, prefixSeq)
        const active = activeRef.current
        if (!active || active.identity !== identity) return
        active.lastSeq = event.seq
        try {
          enqueueAgentTurnOverlayChunk(active, event.chunk)
          active.controller.enqueue({ type: 'message-metadata', messageMetadata: {
            custom: { waoAgentTurnStreamSeq: event.seq },
          } })
        } catch {
          close()
        }
      }),
    [close, params.projectId, params.view, start, subscribeTaskEvents],
  )

  useEffect(() => {
    const active = activeRef.current
    if (!active) return
    const turn = params.view?.currentTurn ?? null
    const expectedPrefix = turn ? `${turn.turnId}:${String(turn.attempt)}:` : null
    if (
      !turn ||
      (turn.status !== 'running' && turn.status !== 'waiting_approval') ||
      !active.identity.startsWith(expectedPrefix ?? '\u0000')
    ) {
      close()
    }
  }, [close, message?.id, params.view])

  useEffect(() => close, [close])
  return message
}

export function useWorkspaceAssistantRuntime({
  projectId,
  selectedScopeRef,
  selectedAssetId,
}: UseWorkspaceAssistantRuntimeParams): UseWorkspaceAssistantRuntimeResult {
  const locale = useLocale()
  const viewQuery = useAgentSessionView(projectId)
  const refetchAgentSessionView = viewQuery.refetch
  const view = viewQuery.data ?? null
  const scopeKey = projectId
  const scopeKeyRef = useRef(scopeKey)
  useLayoutEffect(() => { scopeKeyRef.current = scopeKey }, [scopeKey])
  const overlay = useAgentTurnOverlay({
    projectId,
    view,
  })
  const [optimisticState, setOptimisticState] = useState<{
    scopeKey: string
    messages: UIMessage[]
  }>(() => ({ scopeKey, messages: [] }))
  const [commandPendingState, setCommandPendingState] = useState<{
    scopeKey: string
    value: boolean
  }>(() => ({ scopeKey, value: false }))
  const [commandErrorState, setCommandErrorState] = useState<{
    scopeKey: string
    value: Error | null
  }>(() => ({ scopeKey, value: null }))
  const optimisticMessages = useMemo(
    () => (optimisticState.scopeKey === scopeKey ? optimisticState.messages : []),
    [optimisticState, scopeKey],
  )
  const commandPending =
    commandPendingState.scopeKey === scopeKey ? commandPendingState.value : false
  const commandError = commandErrorState.scopeKey === scopeKey ? commandErrorState.value : null
  const setOptimisticMessages = useCallback(
    (update: UIMessage[] | ((current: UIMessage[]) => UIMessage[])) => {
      setOptimisticState((current) => {
        const messages = current.scopeKey === scopeKey ? current.messages : []
        return {
          scopeKey,
          messages: typeof update === 'function' ? update(messages) : update,
        }
      })
    },
    [scopeKey],
  )
  const setCommandPending = useCallback(
    (value: boolean) => {
      setCommandPendingState({ scopeKey, value })
    },
    [scopeKey],
  )
  const setCommandError = useCallback(
    (value: Error | null) => {
      setCommandErrorState({ scopeKey, value })
    },
    [scopeKey],
  )
  const persistedMessages = useMemo(
    () => [...(view?.thread?.messages ?? [])],
    [view?.thread?.messages],
  )
  const refetchView = useCallback(async (): Promise<AgentSessionView | null> => {
    const result = await refetchAgentSessionView({ cancelRefetch: true })
    if (result.error) return null
    return result.data ?? null
  }, [refetchAgentSessionView])
  useEffect(() => {
    const persistedIds = new Set(persistedMessages.map((item) => item.id))
    for (const messageId of persistedIds) {
      clearWorkspaceAssistantUserMessageReceipt({ scopeKey, messageId })
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Retire accepted local receipts and drafts when the canonical server snapshot arrives.
    setOptimisticMessages((current) => current.filter((item) => !persistedIds.has(item.id)))
  }, [persistedMessages, scopeKey, setOptimisticMessages])

  const messages = useMemo(() => {
    const next = [...persistedMessages]
    const ids = new Set(next.map((message) => message.id))
    for (const message of optimisticMessages) {
      if (!ids.has(message.id)) {
        next.push(message)
        ids.add(message.id)
      }
    }
    const currentTurn = view?.currentTurn
    if (overlay && currentTurn && readAssistantRuntimeMessageTurnId(overlay) === currentTurn.turnId
      && readAssistantRuntimeMessageAttempt(overlay) === currentTurn.attempt
      && (currentTurn.status === 'running' || currentTurn.status === 'waiting_approval')
      && readPersistedAgentTurnStreamSeq(overlay) > readTurnStreamSeq(persistedMessages, currentTurn.turnId, currentTurn.attempt)) {
      // The validated stream identifies the current segment before its View
      // arrives. Lifecycle still comes exclusively from the owning Turn.
      const presentationTurn = { ...currentTurn, assistantMessageId: overlay.id }
      const liveOverlay = withAssistantRuntimeMessageTurn(overlay, presentationTurn)
      for (let index = 0; index < next.length; index += 1) {
        if (readAssistantRuntimeMessageTurnId(next[index]) === currentTurn.turnId) {
          next[index] = withAssistantRuntimeMessageTurn(next[index], presentationTurn)
        }
      }
      const persistedIndex = next.findIndex((message) => message.id === overlay.id)
      if (persistedIndex >= 0) next[persistedIndex] = liveOverlay
      else if (!ids.has(overlay.id)) next.push(liveOverlay)
    }
    return next
  }, [optimisticMessages, overlay, persistedMessages, view?.currentTurn])

  const submitUserMessage = useCallback(
    async (input: WorkspaceAssistantSendMessageInput, hidden: boolean): Promise<void> => {
      const text = input.text.trim()
      const attachments = input.attachments ?? []
      const mediaAttachments = input.mediaAttachments ?? []
      if (!text && attachments.length === 0 && mediaAttachments.length === 0) {
        return
      }
      const commandScopeKey = scopeKey
      const id = await resolveWorkspaceAssistantUserMessageId({
        scopeKey: commandScopeKey,
        sourceKey: input.sourceKey,
        immutableInput: {
          text,
          attachments,
          mediaAttachments,
          hidden,
          ...(input.canvasGenerationIntent ? { canvasGenerationIntent: input.canvasGenerationIntent } : {}),
          ...(input.expectedProductionConfigurationVersion ? { expectedProductionConfigurationVersion: input.expectedProductionConfigurationVersion } : {}),
        },
      })
      if (scopeKeyRef.current !== commandScopeKey) return
      const message = createUserMessage({
        id,
        text,
        attachments,
        mediaAttachments,
        hidden,
      })
      setCommandError(null)
      setCommandPending(true)
      setOptimisticMessages((current) => [
        ...current.filter((candidate) => candidate.id !== message.id),
        message,
      ])
      try {
        const response = await apiFetch(
          `/api/projects/${encodeURIComponent(projectId)}/assistant/chat`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              message,
              context: {
                ...(input.canvasGenerationIntent ? { canvasGenerationIntent: input.canvasGenerationIntent } : {}),
                ...(input.expectedProductionConfigurationVersion ? { expectedProductionConfigurationVersion: input.expectedProductionConfigurationVersion } : {}),
                locale,
                selectedScopeRef: selectedScopeRef ?? null,
                selectedAssetId: selectedAssetId ?? null,
              },
            }),
          },
        )
        if (!response.ok) {
          throw await readCommandError(response, 'AGENT_TURN_SUBMIT_REQUEST_FAILED')
        }
        const refreshed = await refetchView()
        if (refreshed?.thread?.messages.some((candidate) => candidate.id === id)) {
          clearWorkspaceAssistantUserMessageReceipt({
            scopeKey: commandScopeKey,
            messageId: id,
          })
        }
      } catch (error) {
        const normalized = normalizeWorkspaceAssistantCommandError(error)
        if (scopeKeyRef.current === commandScopeKey) {
          if (normalized.outcome === 'rejected') {
            setOptimisticMessages((current) => current.filter((item) => item.id !== id))
          }
          setCommandError(normalized.error)
        }
        throw normalized.error
      } finally {
        if (scopeKeyRef.current === commandScopeKey) {
          setCommandPending(false)
        }
      }
    },
    [
      locale,
      projectId,
      selectedAssetId,
      selectedScopeRef,
      refetchView,
      scopeKey,
      setCommandError,
      setCommandPending,
      setOptimisticMessages,
    ],
  )

  const sendMessage = useCallback(
    async (input: WorkspaceAssistantSendMessageInput) => {
      await submitUserMessage(input, false)
    },
    [submitUserMessage],
  )
  const sendHiddenMessage = useCallback(
    async (text: string, sourceKey?: string) => {
      await submitUserMessage({ text, sourceKey }, true)
    },
    [submitUserMessage],
  )

  const stopReply = useCallback(async () => {
    const turn = view?.currentTurn
    const threadId = view?.thread?.threadId
    if (!turn || !threadId || !isActiveTurn(view)) return
    const commandScopeKey = scopeKey
    setCommandError(null)
    setCommandPending(true)
    try {
      const response = await apiFetch(
        `/api/projects/${encodeURIComponent(projectId)}/assistant/turns/${encodeURIComponent(turn.turnId)}/cancel`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            threadId,
            requestId: `turn-cancel:${turn.turnId}:user`,
            reason: 'user_cancelled',
          }),
        },
      )
      if (!response.ok) {
        throw await readCommandError(response, 'AGENT_TURN_CANCEL_REQUEST_FAILED')
      }
      await refetchView()
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error))
      if (scopeKeyRef.current === commandScopeKey) {
        setCommandError(normalized)
      }
      throw normalized
    } finally {
      if (scopeKeyRef.current === commandScopeKey) {
        setCommandPending(false)
      }
    }
  }, [projectId, refetchView, scopeKey, setCommandError, setCommandPending, view])

  const resolveApproval = useCallback(
    async (params: { decision: 'approve' | 'reject' }) => {
      const interaction = isAssistantRuntimeApprovalRequest(view?.pendingInteraction ?? null)
        ? view?.pendingInteraction ?? null
        : null
      const threadId = view?.thread?.threadId
      if (!interaction || !threadId) {
        throw new Error('AGENT_TURN_APPROVAL_NOT_PENDING')
      }
      const commandScopeKey = scopeKey
      setCommandError(null)
      setCommandPending(true)
      try {
        const decidedResult = readDecidedInteractionResult(interaction)
        const response = await apiFetch(
          `/api/projects/${encodeURIComponent(projectId)}/assistant/interactions/${encodeURIComponent(interaction.interactionId)}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              threadId,
              requestId: `approval:${interaction.interactionId}:${params.decision}`,
              result: decidedResult
                ?? { decision: params.decision === 'approve' ? 'accept' : 'decline' },
            }),
          },
        )
        if (!response.ok) {
          throw await readCommandError(response, 'AGENT_TURN_APPROVAL_REQUEST_FAILED')
        }
        await refetchView()
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error))
        if (scopeKeyRef.current === commandScopeKey) {
          setCommandError(normalized)
        }
        throw normalized
      } finally {
        if (scopeKeyRef.current === commandScopeKey) {
          setCommandPending(false)
        }
      }
    },
    [
      projectId,
      refetchView,
      scopeKey,
      setCommandError,
      setCommandPending,
      view?.pendingInteraction,
      view?.thread?.threadId,
    ],
  )

  const submitInteractionResponse = useCallback(
    async (params: { response: Record<string, unknown> }) => {
      const interaction = isAssistantRuntimeInputRequest(view?.pendingInteraction ?? null)
        ? view?.pendingInteraction ?? null
        : null
      const threadId = view?.thread?.threadId
      if (!interaction || !threadId) {
        throw new Error('ASSISTANT_RUNTIME_INTERACTION_NOT_PENDING')
      }
      const commandScopeKey = scopeKey
      setCommandError(null)
      setCommandPending(true)
      try {
        const decidedResult = readDecidedInteractionResult(interaction)
        const response = await apiFetch(
          `/api/projects/${encodeURIComponent(projectId)}/assistant/interactions/${encodeURIComponent(interaction.interactionId)}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              threadId,
              requestId: `interaction:${interaction.interactionId}`,
              result: decidedResult ?? params.response,
            }),
          },
        )
        if (!response.ok) {
          throw await readCommandError(response, 'ASSISTANT_RUNTIME_INTERACTION_REQUEST_FAILED')
        }
        await refetchView()
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error))
        if (scopeKeyRef.current === commandScopeKey) {
          setCommandError(normalized)
        }
        throw normalized
      } finally {
        if (scopeKeyRef.current === commandScopeKey) {
          setCommandPending(false)
        }
      }
    },
    [
      projectId,
      refetchView,
      scopeKey,
      setCommandError,
      setCommandPending,
      view?.pendingInteraction,
      view?.thread?.threadId,
    ],
  )

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const text = readAppendMessageText(message)
      if (text) await sendMessage({ text })
    },
    [sendMessage],
  )
  const replyInFlight =
    view?.currentTurn?.status === 'queued'
    || view?.currentTurn?.status === 'running'
    || view?.currentTurn?.status === 'waiting_approval'
  const [projectMessages] = useState(createWorkspaceAssistantMessageProjector)
  const projectedMessages = useMemo(() => projectMessages(messages), [messages, projectMessages])
  const hasRunningMessage = projectedMessages.some((message) => message.role === 'assistant'
    && (message.metadata?.custom?.workTraceStatus === 'running' || message.metadata?.custom?.workTraceStatus === 'queued'))
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages: projectedMessages,
    isLoading: viewQuery.isLoading,
    isRunning: replyInFlight,
    onNew,
    onCancel: stopReply,
    convertMessage: identityMessage,
  })
  const backgroundFollowUpActive =
    replyInFlight && view?.currentTurn?.sourceKind === 'task_follow_up'

  return {
    runtime,
    messages,
    pending: commandPending,
    canStopReply: Boolean(view?.thread && isActiveTurn(view)),
    replyInFlight,
    backgroundFollowUpActive,
    hasRunningMessage,
    view,
    pendingInteraction: view?.pendingInteraction ?? null,
    error: commandError ?? undefined,
    viewError: viewQuery.error ? parseClientError(viewQuery.error).code ?? 'INTERNAL_ERROR' : null,
    viewLoading: viewQuery.isLoading,
    sendMessage,
    sendHiddenMessage,
    stopReply,
    submitInteractionResponse,
    resolveApproval,
  }
}
