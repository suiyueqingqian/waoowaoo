'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-fetch'
import { queryKeys } from '@/lib/query/keys'
import type { WorkspaceCanvasGenerationCapabilitiesView } from '@/lib/workspace-resource/canvas-generation-capabilities'

export function useCanvasGenerationCapabilities(projectId: string) {
  return useQuery({
    queryKey: queryKeys.project.canvasGenerationCapabilities(projectId),
    queryFn: async (): Promise<WorkspaceCanvasGenerationCapabilitiesView> => {
      const response = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/canvas-generation-capabilities`)
      if (!response.ok) throw new Error('WORKSPACE_CANVAS_GENERATION_CAPABILITIES_LOAD_FAILED')
      const body = await response.json() as {
        readonly success: true
        readonly capabilities: WorkspaceCanvasGenerationCapabilitiesView
      }
      return body.capabilities
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
  })
}
