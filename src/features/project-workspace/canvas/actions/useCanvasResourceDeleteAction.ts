'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/contexts/ToastContext'
import { requestOperationMutationVoidWithError } from '@/lib/query/mutations/mutation-shared'
import type { WorkspaceCanvasDeleteOperationView } from '../contracts/workspace-canvas-interactions'

export interface CanvasResourceDeleteTarget {
  readonly operation: WorkspaceCanvasDeleteOperationView
  readonly label: string
}

interface PendingCanvasResourceDelete {
  readonly targets: readonly CanvasResourceDeleteTarget[]
  readonly requestIds: ReadonlyMap<string, string>
}

type CanvasResourceDeletePhase = 'idle' | 'confirming' | 'executing'

/**
 * UI owner for the existing delete_resource Operation, for one card or a
 * bulk selection. Every target is frozen when confirmation opens with its own
 * request identity; a retry keeps the same identities, and a partial failure
 * leaves only the undeleted targets pending. The mutation receipt owns the
 * Query handoff.
 */
export function useCanvasResourceDeleteAction(params: {
  readonly projectId: string
  readonly onDeleted: (deleted: readonly WorkspaceCanvasDeleteOperationView['input'][]) => void
}) {
  const { projectId, onDeleted } = params
  const t = useTranslations('projectWorkflow.canvas.workspace.operationConfirm')
  const { showError } = useToast()
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<CanvasResourceDeletePhase>('idle')
  const [pending, setPending] = useState<PendingCanvasResourceDelete | null>(null)
  const busyRef = useRef(false)

  const begin = useCallback((targets: readonly CanvasResourceDeleteTarget[]) => {
    if (busyRef.current || targets.length === 0) return
    busyRef.current = true
    setPending({
      targets,
      requestIds: new Map(targets.map((target) => [
        target.operation.input.resourceId,
        `delete_resource:${target.operation.approvalInputHash}:${crypto.randomUUID()}`,
      ])),
    })
    setPhase('confirming')
  }, [])

  const confirm = useCallback(async () => {
    if (!pending || phase !== 'confirming') return
    setPhase('executing')
    const deleted: WorkspaceCanvasDeleteOperationView['input'][] = []
    let failure: unknown = null
    for (const target of pending.targets) {
      const { operation } = target
      const requestId = pending.requestIds.get(operation.input.resourceId)
      if (operation.operationId !== 'delete_resource' || !requestId) {
        failure = new Error('WORKSPACE_CANVAS_DELETE_OPERATION_INVALID')
        break
      }
      try {
        await requestOperationMutationVoidWithError(
          `/api/projects/${encodeURIComponent(projectId)}/resources/${encodeURIComponent(operation.input.resourceId)}?workspacePath=${encodeURIComponent(operation.input.workspacePath)}`,
          {
            method: 'DELETE',
            headers: { 'Idempotency-Key': requestId },
          },
          queryClient,
        )
        deleted.push(operation.input)
      } catch (error) {
        failure = error
        break
      }
    }
    if (deleted.length > 0) onDeleted(deleted)
    if (failure !== null) {
      // Keep the undeleted targets with their frozen request identities so a
      // retry cannot silently delete something the user did not confirm.
      const deletedIds = new Set(deleted.map((input) => input.resourceId))
      setPending((current) => (current ? {
        ...current,
        targets: current.targets.filter((target) => !deletedIds.has(target.operation.input.resourceId)),
      } : current))
      setPhase('confirming')
      showError(failure, t('failed'))
      return
    }
    setPending(null)
    setPhase('idle')
    busyRef.current = false
  }, [onDeleted, pending, phase, projectId, queryClient, showError, t])

  const cancel = useCallback(() => {
    if (phase === 'executing') return
    setPending(null)
    setPhase('idle')
    busyRef.current = false
  }, [phase])

  return {
    begin,
    confirm,
    cancel,
    pending,
    phase,
    busy: phase !== 'idle',
  } as const
}
