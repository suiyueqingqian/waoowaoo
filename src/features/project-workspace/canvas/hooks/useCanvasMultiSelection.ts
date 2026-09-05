'use client'

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import type { ReactFlowInstance } from '@xyflow/react'
import type { WorkspaceCanvasFlowNode } from '../node-canvas-types'

export interface CanvasMarqueeRect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

function isPaneTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('.react-flow__pane')) && !target.closest('.react-flow__node')
}

function normalizedRect(
  start: { readonly x: number; readonly y: number },
  end: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

/**
 * The bulk selection set of the Canvas: resource cards gathered by
 * shift-click or by a shift-drag marquee over the pane. It exists only for
 * bulk actions and never replaces the single business selection that opens
 * the details card. React Flow's own element selection stays disabled, so
 * this is the one writer of the set.
 */
export function useCanvasMultiSelection(params: {
  readonly reactFlow: ReactFlowInstance<WorkspaceCanvasFlowNode>
  readonly containerRef: RefObject<HTMLDivElement | null>
}) {
  const { reactFlow, containerRef } = params
  const [selectedNodeIds, setSelectedNodeIds] = useState<ReadonlySet<string>>(() => new Set())
  const [marquee, setMarquee] = useState<CanvasMarqueeRect | null>(null)
  const dragRef = useRef<{
    readonly startClient: { readonly x: number; readonly y: number }
    readonly baseSelection: ReadonlySet<string>
  } | null>(null)
  const suppressPaneClickRef = useRef(false)

  const toggle = useCallback((nodeId: string) => {
    setSelectedNodeIds((current) => {
      const next = new Set(current)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])
  const clear = useCallback(() => {
    setSelectedNodeIds((current) => (current.size === 0 ? current : new Set()))
  }, [])

  const updateMarquee = useCallback((clientX: number, clientY: number) => {
    const drag = dragRef.current
    const bounds = containerRef.current?.getBoundingClientRect()
    if (!drag || !bounds) return
    const rect = normalizedRect(drag.startClient, { x: clientX, y: clientY })
    setMarquee({
      left: rect.x - bounds.left,
      top: rect.y - bounds.top,
      width: rect.width,
      height: rect.height,
    })
    const flowStart = reactFlow.screenToFlowPosition({ x: rect.x, y: rect.y })
    const flowEnd = reactFlow.screenToFlowPosition({ x: rect.x + rect.width, y: rect.y + rect.height })
    const hits = reactFlow.getIntersectingNodes({
      x: flowStart.x,
      y: flowStart.y,
      width: Math.max(1, flowEnd.x - flowStart.x),
      height: Math.max(1, flowEnd.y - flowStart.y),
    }, false)
    const next = new Set(drag.baseSelection)
    for (const node of hits) {
      if (node.data.kind === 'resourceCard') next.add(node.id)
    }
    setSelectedNodeIds(next)
  }, [containerRef, reactFlow])

  useEffect(() => {
    if (!marquee) return
    const onMove = (event: PointerEvent) => updateMarquee(event.clientX, event.clientY)
    const onUp = () => {
      dragRef.current = null
      suppressPaneClickRef.current = true
      setMarquee(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [marquee, updateMarquee])

  // Shift-drag on the pane draws the marquee instead of panning. Stopping the
  // capture-phase pointer and mouse events keeps React Flow's zoom/pan handler
  // from ever seeing the gesture; the pane click that follows is swallowed once.
  const onPointerDownCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.shiftKey || event.button !== 0 || !isPaneTarget(event.target)) return
    event.stopPropagation()
    event.preventDefault()
    dragRef.current = {
      startClient: { x: event.clientX, y: event.clientY },
      baseSelection: selectedNodeIds,
    }
    updateMarquee(event.clientX, event.clientY)
  }, [selectedNodeIds, updateMarquee])
  const onMouseDownCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!event.shiftKey || event.button !== 0 || !isPaneTarget(event.target)) return
    event.stopPropagation()
    event.preventDefault()
  }, [])
  const consumePaneClickSuppression = useCallback((): boolean => {
    const suppressed = suppressPaneClickRef.current
    suppressPaneClickRef.current = false
    return suppressed
  }, [])

  return {
    selectedNodeIds,
    toggle,
    clear,
    marquee,
    marqueeHandlers: { onPointerDownCapture, onMouseDownCapture },
    consumePaneClickSuppression,
  } as const
}
