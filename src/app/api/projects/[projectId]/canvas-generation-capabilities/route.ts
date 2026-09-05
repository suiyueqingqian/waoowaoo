import { NextRequest, NextResponse } from 'next/server'
import { isErrorResponse, requireProjectAuthLight } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { readWorkspaceCanvasGenerationCapabilities } from '@/lib/workspace-resource/canvas-generation-capabilities'

/**
 * GET /api/projects/[projectId]/canvas-generation-capabilities
 * Read-only projection of what the project's configured image and video
 * model accept, for the Canvas draft and editor controls. The planner stays
 * the judge; this only keeps the UI from offering rejected choices.
 */
export const GET = apiHandler(async (
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params
  const auth = await requireProjectAuthLight(projectId)
  if (isErrorResponse(auth)) return auth
  const capabilities = await readWorkspaceCanvasGenerationCapabilities({
    projectId,
    userId: auth.session.user.id,
  })
  return NextResponse.json({ success: true, capabilities })
})
