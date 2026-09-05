import type { TaskRuntimeTarget } from '@/lib/task/runtime-targets'

export interface WorkspaceAssistantActiveTaskTarget extends TaskRuntimeTarget {
  readonly taskId: string
  readonly operationId?: string | null
  readonly sourceKind?: string | null
}

export interface WorkspaceAssistantActiveFocusRequest {
  readonly operationId: string
  readonly requestKey: string
  readonly taskTargets?: readonly WorkspaceAssistantActiveTaskTarget[]
}

/**
 * What one user Turn produced, keyed by the deterministic identity of the
 * user message that started it. The Canvas uses it to place Resources a
 * Canvas draft asked the assistant for: the chain is message identity → Turn
 * → follow-up batch → Task targets, never "the newest card".
 */
export interface WorkspaceAssistantTurnOutcomeView {
  readonly turnId: string
  readonly sourceMessageId: string
  /** True once the Turn reached a terminal status. */
  readonly terminal: boolean
  /** WorkspaceResource identities reserved by this Turn's Operations. */
  readonly resourceTargetIds: readonly string[]
}
