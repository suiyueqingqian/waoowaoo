import { getToolName, isToolUIPart, type UIMessage } from 'ai'
import type { ThreadMessageLike } from '@assistant-ui/react'
import {
  readAssistantRuntimeMessageTurn,
  readAssistantRuntimeMessageAttempt,
  readAssistantRuntimeTextPresentation,
  isAssistantRuntimePresentedMessage,
  type AssistantRuntimeMessageTurn,
} from '@/lib/assistant-runtime/message-presentation'
import {
  resolveWorkspaceAssistantToolCallDisplayState,
  WORKSPACE_ASSISTANT_HIDDEN_TRACE_TOOL_NAMES,
  type WorkspaceAssistantToolCallDisplayState,
} from './workspace-assistant-run-trace'

type MessagePart = Exclude<ThreadMessageLike['content'], string>[number]
export type WorkspaceAssistantTraceStatus = AssistantRuntimeMessageTurn['status'] | 'continued'
export type WorkspaceAssistantTraceTool = {
  readonly kind: 'tool'
  readonly id: string
  readonly toolCallId: string
  readonly toolName: string
  readonly args: unknown
  readonly result: unknown
  readonly displayState: WorkspaceAssistantToolCallDisplayState
  readonly progress: string | null
}
export type WorkspaceAssistantTraceEntry = WorkspaceAssistantTraceTool | {
  readonly kind: 'reasoning' | 'commentary'
  readonly id: string
  readonly text: string
} | {
  readonly kind: 'compaction'
  readonly id: string
  readonly status: 'running' | 'completed' | 'failed'
  readonly replacedItemCount: number
}
export type WorkspaceAssistantWorkTraceView = {
  readonly status: WorkspaceAssistantTraceStatus
  readonly startedAt: string | null
  readonly finishedAt: string | null
  readonly entries: readonly WorkspaceAssistantTraceEntry[]
  readonly classificationUnavailable: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function messageStatus(status: WorkspaceAssistantTraceStatus): ThreadMessageLike['status'] {
  switch (status) {
    case 'queued': case 'running': case 'waiting_approval': return { type: 'running' }
    case 'failed': return { type: 'incomplete', reason: 'error' }
    case 'cancelled': case 'interrupted': return { type: 'incomplete', reason: 'cancelled' }
    case 'continued': case 'completed': return { type: 'complete', reason: 'stop' }
  }
}

function standardPart(part: UIMessage['parts'][number]): MessagePart | null {
  if (part.type === 'text') return { type: 'text', text: part.text }
  if (part.type === 'file') return { type: 'file', data: part.url, mimeType: part.mediaType, filename: part.filename }
  if (part.type === 'source-url') return { type: 'source', sourceType: 'url', id: part.sourceId, url: part.url, title: part.title }
  return null
}

/** One immutable message -> one work trace + explicit final answer. Native
 * item IDs join resumed fragments; text/position never determine finality. */
function projectMessage(message: UIMessage): ThreadMessageLike {
  const metadata = isRecord(message.metadata) ? message.metadata : {}
  const base = {
    id: message.id, role: message.role,
    metadata,
  }
  // User input exists before Turn admission. Only assistant output carries
  // the runtime presentation contract; ordinary messages never read it.
  if (message.role !== 'assistant') {
    return { ...base, content: message.parts.flatMap((part) => {
      const converted = standardPart(part)
      return converted ? [converted] : []
    }) }
  }

  const turn = readAssistantRuntimeMessageTurn(message)
  const attempt = readAssistantRuntimeMessageAttempt(message)
  if (!turn || attempt === null) {
    throw new Error('ASSISTANT_RUNTIME_MESSAGE_TURN_MISSING')
  }
  const status: WorkspaceAssistantTraceStatus = attempt !== turn.attempt
    || (turn.assistantMessageId !== null && turn.assistantMessageId !== message.id) ? 'continued' : turn.status

  const entries: WorkspaceAssistantTraceEntry[] = []
  const notices: MessagePart[] = []
  const finalById = new Map<string, string>()
  const textById = new Map<string, { text: string; phase: 'commentary' | 'final_answer' | null; kind: 'text' | 'reasoning' }>()
  const progressById = new Map<string, string>()
  for (const part of message.parts) {
    if (part.type === 'text' || part.type === 'reasoning') {
      const presentation = readAssistantRuntimeTextPresentation(part)
      if (!presentation) throw new Error('ASSISTANT_RUNTIME_MESSAGE_PRESENTATION_REQUIRED')
      const id = presentation.itemId
      const previous = textById.get(id)
      textById.set(id, {
        text: (previous?.text ?? '') + part.text,
        phase: presentation.phase ?? previous?.phase ?? null,
        kind: part.type,
      })
    }
    if (part.type === 'data-assistant-runtime-progress' && isRecord(part.data)
      && typeof part.data.itemId === 'string' && typeof part.data.message === 'string') {
      progressById.set(part.data.itemId, part.data.message)
    }
  }
  const emittedText = new Set<string>()
  const hiddenTools: readonly string[] = WORKSPACE_ASSISTANT_HIDDEN_TRACE_TOOL_NAMES
  for (const [index, part] of message.parts.entries()) {
    if (part.type === 'text' || part.type === 'reasoning') {
      const presentation = readAssistantRuntimeTextPresentation(part)
      if (!presentation) throw new Error('ASSISTANT_RUNTIME_MESSAGE_PRESENTATION_REQUIRED')
      const id = presentation.itemId
      if (emittedText.has(id)) continue
      emittedText.add(id)
      const value = textById.get(id)!
      if (!value.text.trim()) continue
      if (value.kind === 'text' && value.phase === 'final_answer') finalById.set(id, value.text)
      else entries.push({
        id, text: value.text,
        kind: value.kind === 'reasoning' ? 'reasoning' : 'commentary',
      })
      continue
    }
    if (isToolUIPart(part)) {
      const toolName = getToolName(part)
      if (hiddenTools.includes(toolName)) continue
      const result = part.state === 'output-available' ? part.output
        : part.state === 'output-error' ? { error: part.errorText }
          : part.state === 'output-denied' ? { status: 'declined' } : undefined
      const displayState = resolveWorkspaceAssistantToolCallDisplayState({
        status: { type: part.state === 'approval-requested' ? 'requires-action'
          : part.state === 'output-available' || part.state === 'output-error' || part.state === 'output-denied' ? 'complete'
            : status === 'running' || status === 'waiting_approval' ? 'running' : 'incomplete' },
        result, isError: part.state === 'output-error',
        errorText: part.state === 'output-error' ? part.errorText : undefined,
      })
      entries.push({ kind: 'tool', id: part.toolCallId, toolCallId: part.toolCallId, toolName,
        args: part.input, result, displayState,
        progress: displayState === 'running' ? progressById.get(part.toolCallId) ?? null : null,
      })
      continue
    }
    if (part.type === 'data-assistant-context-compacted' && isRecord(part.data)) {
      const compactionStatus = part.data.status
      if (compactionStatus !== 'running' && compactionStatus !== 'completed' && compactionStatus !== 'failed') {
        throw new Error('ASSISTANT_RUNTIME_COMPACTION_STATUS_INVALID')
      }
      if (typeof part.data.replacedItemCount !== 'number') throw new Error('ASSISTANT_RUNTIME_COMPACTION_COUNT_INVALID')
      entries.push({ kind: 'compaction', id: part.id ?? `${message.id}:compaction:${index}`,
        status: compactionStatus, replacedItemCount: part.data.replacedItemCount })
    } else if (part.type === 'data-assistant-runtime-goal' || part.type === 'data-assistant-runtime-skills') {
      notices.push({ type: 'data', name: part.type.slice(5), data: part.data })
    } else {
      const converted = standardPart(part)
      if (converted) notices.push(converted)
    }
  }
  const finalText = [...finalById.values()].join('\n\n')
  const trace: WorkspaceAssistantWorkTraceView = {
    status, startedAt: turn.startedAt, finishedAt: turn.finishedAt,
    entries,
    // Current native protocol permits unknown phase. Surface that missing
    // presentation capability without changing the Turn's business outcome.
    classificationUnavailable: status === 'completed' && !finalText
      && [...textById.values()].some((value) => value.kind === 'text' && value.phase === null && value.text.trim()),
  }
  const content: MessagePart[] = []
  if (entries.length || status === 'queued' || status === 'running' || status === 'waiting_approval') {
    content.push({ type: 'data', name: 'assistant-work-trace', data: trace })
  }
  content.push(...notices)
  // All explicit final fragments belong to the one result area. Do not select
  // a latest-looking unphased text as a substitute final answer.
  if (finalText) content.push({ type: 'text', text: finalText })
  return { ...base, createdAt: new Date(turn.createdAt), content, status: messageStatus(status),
    metadata: { ...metadata, custom: { ...(isRecord(metadata.custom) ? metadata.custom : {}), workTraceStatus: status } },
  }
}

/** Same per-panel WeakMap strategy as Horror. Query's structural sharing
 * retains JSON message identity across authority reads; removals still win. */
export function createWorkspaceAssistantMessageProjector() {
  const cache = new WeakMap<UIMessage, ThreadMessageLike>()
  let previous: readonly ThreadMessageLike[] = []
  return (messages: readonly UIMessage[]): readonly ThreadMessageLike[] => {
    const next = messages.filter(isAssistantRuntimePresentedMessage).map((message) => {
      const existing = cache.get(message)
      if (existing) return existing
      const projected = projectMessage(message)
      cache.set(message, projected)
      return projected
    })
    if (next.length === previous.length && next.every((message, index) => message === previous[index])) return previous
    previous = next
    return next
  }
}
