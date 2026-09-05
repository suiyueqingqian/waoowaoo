import { NextRequest, NextResponse } from 'next/server'
import { isErrorResponse, requireProjectAuthLight } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { executeProjectAgentOperationFromApi } from '@/lib/adapters/api/execute-project-agent-operation'
import { readOperationRequestId } from '@/lib/operations/api-request-identity'

/**
 * Canvas undo adapter for a soft delete. The deleted Resource identity is
 * passed unchanged into the sole restore Operation, which restores the exact
 * deletion cohort at its last path; a path conflict fails explicitly instead
 * of renaming. The mutation receipt is the browser Query handoff.
 */
export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string; resourceId: string }> },
) => {
  const { projectId, resourceId } = await context.params
  const auth = await requireProjectAuthLight(projectId)
  if (isErrorResponse(auth)) return auth
  const operationRequestId = readOperationRequestId(request, {
    required: true,
    operationId: 'restore_resource',
  })
  if (!operationRequestId.startsWith(`restore_resource:${resourceId}:`)) {
    throw new ApiError('CONFLICT', {
      code: 'APPROVAL_GRANT_REQUEST_MISMATCH',
      operationId: 'restore_resource',
    })
  }
  const result = await executeProjectAgentOperationFromApi({
    request,
    operationId: 'restore_resource',
    projectId,
    userId: auth.session.user.id,
    input: { resourceId, destinationPath: null },
    source: 'project-ui',
    responseContract: 'operation_mutation_response_v1',
    requireIdempotencyKey: true,
  })
  return NextResponse.json(result)
})
