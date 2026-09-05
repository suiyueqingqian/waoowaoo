export const WORKSPACE_ASSISTANT_HIDDEN_TRACE_TOOL_NAMES = [
  'update_plan',
] as const

type MessagePartRecord = {
  readonly type?: unknown
  readonly data?: unknown
  readonly status?: unknown
  readonly result?: unknown
  readonly errorText?: unknown
  readonly structuredContent?: unknown
  readonly isError?: unknown
  readonly ok?: unknown
  readonly async?: unknown
  readonly taskId?: unknown
  readonly taskIds?: unknown
}

const RUNTIME_TOOL_INTERRUPTED_PREFIX = 'ASSISTANT_RUNTIME_TOOL_INTERRUPTED:'

export type WorkspaceAssistantToolCallDisplayState =
  | 'success'
  | 'submitted'
  | 'failed'
  | 'interrupted'
  | 'running'
  | 'needsAction'

function readPart(value: unknown): MessagePartRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as MessagePartRecord
    : null
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function isSubmittedToolResult(result: unknown): boolean {
  const record = readPart(result)
  if (record?.ok !== true) return false
  const data = readPart(record.data)
  if (data?.async !== true) return false
  if (typeof data.taskId === 'string' && data.taskId.trim()) return true
  return Array.isArray(data.taskIds)
    && data.taskIds.some((taskId) => typeof taskId === 'string' && taskId.trim())
}

function isFailedToolResult(result: unknown): boolean {
  const record = readPart(result)
  return record?.ok === false || record?.status === 'failed' || record?.status === 'errored'
}

function isInterruptedToolResult(result: unknown): boolean {
  const record = readPart(result)
  const nestedResult = readPart(record?.result)
  const structuredContent = readPart(record?.structuredContent)
    ?? readPart(nestedResult?.structuredContent)
  return [record?.status, structuredContent?.status].some((status) => (
    status === 'declined' || status === 'interrupted' || status === 'cancelled'
  ))
}

export function resolveWorkspaceAssistantToolCallDisplayState(
  value: unknown,
): WorkspaceAssistantToolCallDisplayState {
  const part = readPart(value)
  const status = readPart(part?.status)?.type
  if (status === 'incomplete') return 'interrupted'
  if (status === 'requires-action') return 'needsAction'
  if (status !== 'complete') return 'running'
  if (readNonEmptyString(part?.errorText)?.startsWith(RUNTIME_TOOL_INTERRUPTED_PREFIX)) {
    return 'interrupted'
  }
  if (isInterruptedToolResult(part?.result)) return 'interrupted'
  if (part?.isError === true || isFailedToolResult(part?.result)) return 'failed'
  return isSubmittedToolResult(part?.result) ? 'submitted' : 'success'
}
