'use client'

import { useCallback, useRef, useState, type RefObject } from 'react'
import type { WorkspaceCanvasFlowNode } from '../node-canvas-types'

export type CanvasReferenceDropTarget = 'draft' | 'details'

interface DropTargetHit {
  readonly target: CanvasReferenceDropTarget
}

function containsPoint(rect: DOMRect, point: { readonly clientX: number; readonly clientY: number }): boolean {
  return point.clientX >= rect.left && point.clientX <= rect.right && point.clientY >= rect.top && point.clientY <= rect.bottom
}

/**
 * "Use as reference" by dragging: while a resource card is dragged over the
 * open draft card or the selected card's details panel, that target lights
 * up; dropping there hands the card over as a reference and the dragged node
 * springs back to where it started, so a reference drop never moves layout.
 * Hit testing uses the rendered DOM boxes, which is exact for both viewport
 * portals and nodes regardless of zoom.
 */
export function useCanvasReferenceDrop(params: {
  readonly draftTargetRef: RefObject<HTMLDivElement | null>
  readonly detailsTargetSelector: string | null
}) {
  const { draftTargetRef, detailsTargetSelector } = params
  const [activeTarget, setActiveTarget] = useState<CanvasReferenceDropTarget | null>(null)
  const startPositionsRef = useRef<Map<string, { readonly x: number; readonly y: number }>>(new Map())

  const hitTest = useCallback((node: WorkspaceCanvasFlowNode, point: { readonly clientX: number; readonly clientY: number }): DropTargetHit | null => {
    if (node.data.kind !== 'resourceCard') return null
    const draftElement = draftTargetRef.current
    if (draftElement && containsPoint(draftElement.getBoundingClientRect(), point)) {
      return { target: 'draft' }
    }
    const detailsElement = detailsTargetSelector ? document.querySelector(detailsTargetSelector) : null
    if (detailsElement && containsPoint(detailsElement.getBoundingClientRect(), point)) {
      return { target: 'details' }
    }
    return null
  }, [detailsTargetSelector, draftTargetRef])

  const onDragStart = useCallback((nodes: readonly WorkspaceCanvasFlowNode[]) => {
    startPositionsRef.current = new Map(nodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }]))
  }, [])

  const onDrag = useCallback((node: WorkspaceCanvasFlowNode, point: { readonly clientX: number; readonly clientY: number }) => {
    const hit = hitTest(node, point)
    setActiveTarget((current) => (current === (hit?.target ?? null) ? current : hit?.target ?? null))
  }, [hitTest])

  /** Returns the drop target and the pre-drag positions when the drag ended on a target. */
  const onDragStop = useCallback((node: WorkspaceCanvasFlowNode, point: { readonly clientX: number; readonly clientY: number }): {
    readonly target: CanvasReferenceDropTarget
    readonly startPositions: ReadonlyMap<string, { readonly x: number; readonly y: number }>
  } | null => {
    setActiveTarget(null)
    const hit = hitTest(node, point)
    const startPositions = startPositionsRef.current
    startPositionsRef.current = new Map()
    return hit ? { target: hit.target, startPositions } : null
  }, [hitTest])

  return { activeTarget, onDragStart, onDrag, onDragStop } as const
}
