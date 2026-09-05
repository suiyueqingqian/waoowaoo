'use client'

import { useCallback, useRef } from 'react'

interface CanvasPoint {
  readonly x: number
  readonly y: number
}

export type CanvasHistoryEntry =
  | {
      readonly kind: 'move'
      readonly changes: readonly { readonly nodeId: string; readonly from: CanvasPoint; readonly to: CanvasPoint }[]
    }
  | {
      readonly kind: 'delete'
      readonly resources: readonly { readonly resourceId: string; readonly workspacePath: string; readonly name: string }[]
    }

const MAX_HISTORY_ENTRIES = 100

/**
 * Undo/redo journal of Canvas user actions. Moves are pure layout facts and
 * replay both ways; a delete undo restores through the restore Operation and
 * is not redoable, because re-deleting must go through confirmation again.
 * The journal never interprets Resource state; it only remembers what the
 * user did and lets the Canvas owner apply the inverse.
 */
export function useCanvasHistory() {
  // The journal is consulted only from event handlers, so it lives in refs
  // and never drives a render.
  const undoRef = useRef<CanvasHistoryEntry[]>([])
  const redoRef = useRef<Extract<CanvasHistoryEntry, { kind: 'move' }>[]>([])

  const push = useCallback((entry: CanvasHistoryEntry) => {
    undoRef.current = [...undoRef.current.slice(-(MAX_HISTORY_ENTRIES - 1)), entry]
    redoRef.current = []
  }, [])

  const undo = useCallback((): CanvasHistoryEntry | null => {
    const entry = undoRef.current.at(-1) ?? null
    if (!entry) return null
    undoRef.current = undoRef.current.slice(0, -1)
    if (entry.kind === 'move') redoRef.current = [...redoRef.current, entry]
    return entry
  }, [])

  const redo = useCallback((): Extract<CanvasHistoryEntry, { kind: 'move' }> | null => {
    const entry = redoRef.current.at(-1) ?? null
    if (!entry) return null
    redoRef.current = redoRef.current.slice(0, -1)
    undoRef.current = [...undoRef.current, entry]
    return entry
  }, [])

  return { push, undo, redo } as const
}
