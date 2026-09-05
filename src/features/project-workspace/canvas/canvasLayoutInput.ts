import type { CanvasNodeLayoutInput, UpsertCanvasLayoutInput } from '@/lib/project-canvas/layout/canvas-layout-contract'
import type { Viewport } from '@xyflow/react'
import { DEFAULT_WORKSPACE_CANVAS_VIEWPORT } from './canvasViewport'
import type { WorkspaceCanvasFlowNode } from './node-canvas-types'

export function buildWorkspaceCanvasLayoutInput(params: {
  readonly folderKey: string
  readonly viewport?: Viewport
  readonly nodes: readonly WorkspaceCanvasFlowNode[]
  readonly retainedLayouts?: readonly CanvasNodeLayoutInput[]
  readonly existingNodeKeys?: ReadonlySet<string>
  readonly parentNodeKeys?: ReadonlyMap<string, string>
}): UpsertCanvasLayoutInput {
  const byId = new Map(params.nodes.map((node) => [node.id, node]))
  const absolutePosition = (node: WorkspaceCanvasFlowNode): { x: number; y: number } => {
    let x = node.position.x
    let y = node.position.y
    let parentId = node.parentId
    const seen = new Set([node.id])
    while (parentId) {
      if (seen.has(parentId)) throw new Error('CANVAS_LAYOUT_PARENT_CYCLE')
      seen.add(parentId)
      const parent = byId.get(parentId)
      if (!parent) throw new Error('CANVAS_LAYOUT_PARENT_MISSING')
      x += parent.position.x
      y += parent.position.y
      parentId = parent.parentId
    }
    return { x, y }
  }
  const previousById = new Map((params.retainedLayouts ?? []).map((item) => [item.nodeKey, item]))
  const retained = (params.retainedLayouts ?? [])
    .filter((item) => !byId.has(item.nodeKey) && params.existingNodeKeys?.has(item.nodeKey))
    .map((item) => {
      let parentId = params.parentNodeKeys?.get(item.nodeKey)
      const seen = new Set([item.nodeKey])
      while (parentId) {
        if (seen.has(parentId)) throw new Error('CANVAS_LAYOUT_PARENT_CYCLE')
        seen.add(parentId)
        const parent = byId.get(parentId)
        if (parent) {
          const previous = previousById.get(parentId)
          if (!previous) return item
          const current = absolutePosition(parent)
          return { ...item, x: item.x + current.x - previous.x, y: item.y + current.y - previous.y }
        }
        parentId = params.parentNodeKeys?.get(parentId)
      }
      return item
    })
  return {
    folderKey: params.folderKey,
    viewport: params.viewport ?? DEFAULT_WORKSPACE_CANVAS_VIEWPORT,
    // One canvas coordinate system, including members of expanded folders.
    nodeLayouts: [...retained, ...params.nodes.map((node, index) => ({
      nodeKey: node.id,
      nodeType: node.data.layoutNodeType,
      targetType: node.data.targetType,
      targetId: node.data.targetId,
      ...absolutePosition(node),
      width: node.data.width,
      height: node.data.height,
      zIndex: typeof node.zIndex === 'number' ? node.zIndex : index,
      locked: false,
      collapsed: false,
    }))],
  }
}
