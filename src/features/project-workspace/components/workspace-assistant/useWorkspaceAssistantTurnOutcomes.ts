'use client'

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type {
  AssistantRuntimeSessionTurnView,
  AssistantRuntimeSessionView,
} from '@/lib/assistant-runtime/view-contract'
import type { WorkspaceAssistantTurnOutcomeView } from '../../workspace-assistant-focus'

const TERMINAL_TURN_STATUSES: ReadonlySet<AssistantRuntimeSessionTurnView['status']> = new Set([
  'completed',
  'failed',
  'interrupted',
  'cancelled',
])

function projectTurnOutcomes(view: AssistantRuntimeSessionView | null): readonly WorkspaceAssistantTurnOutcomeView[] {
  if (!view) return []
  const turns = [
    ...(view.currentTurn ? [view.currentTurn] : []),
    ...view.queuedTurns,
    ...view.recentTurns,
  ]
  const seen = new Set<string>()
  const outcomes: WorkspaceAssistantTurnOutcomeView[] = []
  for (const turn of turns) {
    if (turn.sourceKind !== 'user' || seen.has(turn.turnId)) continue
    seen.add(turn.turnId)
    const resourceTargetIds = new Set<string>()
    for (const batch of view.followUpBatches) {
      if (batch.originTurnId !== turn.turnId) continue
      for (const task of batch.tasks) {
        if (task.targetType === 'WorkspaceResource') resourceTargetIds.add(task.targetId)
      }
    }
    outcomes.push({
      turnId: turn.turnId,
      sourceMessageId: turn.sourceId,
      terminal: TERMINAL_TURN_STATUSES.has(turn.status),
      resourceTargetIds: [...resourceTargetIds],
    })
  }
  return outcomes
}

/**
 * Publishes the per-Turn outcome projection of the assistant view to the
 * workspace owner. Only the assistant panel reads the runtime view; the
 * Canvas consumes this typed projection to place what its drafts asked for.
 */
export function useWorkspaceAssistantTurnOutcomes({
  view,
  storageLoading,
  onChange,
}: {
  readonly view: AssistantRuntimeSessionView | null
  readonly storageLoading: boolean
  readonly onChange?: (outcomes: readonly WorkspaceAssistantTurnOutcomeView[]) => void
}): void {
  const outcomes = useMemo(() => (storageLoading ? [] : projectTurnOutcomes(view)), [storageLoading, view])
  const callbackRef = useRef(onChange)
  const signatureRef = useRef<string | null>(null)
  useLayoutEffect(() => { callbackRef.current = onChange }, [onChange])
  useEffect(() => {
    const signature = JSON.stringify(outcomes)
    if (signatureRef.current === signature) return
    signatureRef.current = signature
    callbackRef.current?.(outcomes)
  }, [outcomes])
  useEffect(() => () => callbackRef.current?.([]), [])
}
