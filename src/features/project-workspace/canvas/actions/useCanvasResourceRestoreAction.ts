'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/contexts/ToastContext'
import { queryKeys } from '@/lib/query/keys'
import { requestOperationMutationVoidWithError } from '@/lib/query/mutations/mutation-shared'

/**
 * UI owner for undoing a Canvas delete through the existing restore_resource
 * Operation. Each Resource restores under its own request identity; the
 * mutation receipt owns the Query handoff and a failure stays visible.
 */
export function useCanvasResourceRestoreAction(params: { readonly projectId: string }) {
  const { projectId } = params
  const t = useTranslations('projectWorkflow.canvas.workspace.history')
  const { showError, showToast } = useToast()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  const restore = useCallback(async (
    resources: readonly { readonly resourceId: string }[],
  ): Promise<number> => {
    if (busy || resources.length === 0) return 0
    setBusy(true)
    let restored = 0
    try {
      for (const resource of resources) {
        await requestOperationMutationVoidWithError(
          `/api/projects/${encodeURIComponent(projectId)}/resources/${encodeURIComponent(resource.resourceId)}/restore`,
          {
            method: 'POST',
            headers: { 'Idempotency-Key': `restore_resource:${resource.resourceId}:${crypto.randomUUID()}` },
          },
          queryClient,
        )
        restored += 1
      }
      showToast(t('restored', { count: restored }), 'success')
    } catch (error) {
      showError(error, t('restoreFailed'))
    } finally {
      await queryClient.invalidateQueries({ queryKey: queryKeys.project.workspaceResourcesAll(projectId) })
      setBusy(false)
    }
    return restored
  }, [busy, projectId, queryClient, showError, showToast, t])

  return { restore, busy } as const
}
