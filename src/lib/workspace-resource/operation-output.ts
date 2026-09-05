/**
 * The Resource identities a media generation Operation acknowledges on
 * execute. Callers that place freshly reserved Resources (the Canvas) read
 * them from here instead of guessing from task targets or query order.
 */
export interface WorkspaceResourceOperationOutputResource {
  readonly resourceId: string
  readonly workspacePath: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function readWorkspaceResourceOperationOutputResources(
  value: unknown,
): readonly WorkspaceResourceOperationOutputResource[] {
  if (!isRecord(value) || !Array.isArray(value.resources)) {
    throw new Error('WORKSPACE_RESOURCE_OPERATION_OUTPUT_INVALID')
  }
  return value.resources.map((entry) => {
    if (
      !isRecord(entry)
      || typeof entry.resourceId !== 'string'
      || !entry.resourceId
      || typeof entry.workspacePath !== 'string'
      || !entry.workspacePath
    ) {
      throw new Error('WORKSPACE_RESOURCE_OPERATION_OUTPUT_INVALID')
    }
    return { resourceId: entry.resourceId, workspacePath: entry.workspacePath }
  })
}
