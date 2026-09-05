import type {
  WorkspaceCanvasFlowEdge,
  WorkspaceCanvasFlowNode,
} from '../node-canvas-types'

function stableRecord(value: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((record, key) => {
      if (key === 'onAction') return record
      record[key] = value[key]
      return record
    }, {})
}

function nodeSignature(node: WorkspaceCanvasFlowNode): string {
  return JSON.stringify({
    id: node.id,
    type: node.type,
    position: node.position,
    zIndex: node.zIndex ?? null,
    draggable: node.draggable ?? null,
    selectable: node.selectable ?? null,
    style: node.style ?? null,
    data: stableRecord(node.data),
  })
}

function edgeSignature(edge: WorkspaceCanvasFlowEdge): string {
  return JSON.stringify({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type ?? null,
    animated: edge.animated ?? null,
    style: edge.style ?? null,
  })
}

export function buildWorkspaceCanvasNodeSignature(nodes: readonly WorkspaceCanvasFlowNode[]): string {
  return nodes.map(nodeSignature).join('\n')
}

export function buildWorkspaceCanvasEdgeSignature(edges: readonly WorkspaceCanvasFlowEdge[]): string {
  return edges.map(edgeSignature).join('\n')
}
