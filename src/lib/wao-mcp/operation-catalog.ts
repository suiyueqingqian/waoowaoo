import type { Tool, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import { createProjectAgentOperationRegistry } from '@/lib/operations/registry'
import type { ProjectAgentOperationDefinition } from '@/lib/operations/types'
import { projectProductionToolInputSchema } from '@/lib/operations/production-tool-schema'
import type { ProjectProductionContext } from '@/lib/project-production-context'

export type WaoMcpOperationId = string

export interface WaoMcpOperationCatalogEntry {
  readonly operationId: WaoMcpOperationId
  readonly operation: ProjectAgentOperationDefinition
  readonly tool: Tool
}

function projectAnnotations(
  operation: ProjectAgentOperationDefinition,
): ToolAnnotations {
  return {
    readOnlyHint: !operation.effects.writes,
    destructiveHint:
      operation.effects.destructive ||
      operation.confirmation.kind === 'destructive',
    openWorldHint: operation.effects.externalSideEffects,
  }
}

function projectTool(
  operation: ProjectAgentOperationDefinition,
): Tool {
  return {
    name: operation.id,
    description: operation.summary,
    // Registry construction already validates this as a closed object JSON
    // Schema. Keep the exact registry-owned object; MCP must not regenerate or
    // reinterpret the Operation contract.
    inputSchema: operation.toolInputSchema as unknown as Tool['inputSchema'],
    annotations: projectAnnotations(operation),
  }
}

export function createWaoMcpOperationCatalog(context: ProjectProductionContext): readonly WaoMcpOperationCatalogEntry[] {
  const registry = createProjectAgentOperationRegistry()
  const exposed = Object.values(registry).filter(
    (operation) => operation.channels.mcp,
  )

  return exposed.flatMap((operation) => {
    if (!operation.channels.tool) {
      throw new Error(
        `WAO_MCP_OPERATION_TOOL_CHANNEL_REQUIRED:${operation.id}`,
      )
    }
    const schema = projectProductionToolInputSchema(operation, context)
    if (!schema) return []
    return [{
      operationId: operation.id,
      operation,
      tool: projectTool({ ...operation, toolInputSchema: schema }),
    }]
  })
}
