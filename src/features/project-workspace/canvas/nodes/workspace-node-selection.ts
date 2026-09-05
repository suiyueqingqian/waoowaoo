import { createContext } from 'react'

export interface WorkspaceCanvasResourceSelectRequest {
  /** Shift/⌘-click: toggle bulk membership instead of moving the single selection. */
  readonly additive: boolean
}

/**
 * Renderer bridge into ProjectWorkspace's sole controlled Canvas selection.
 * The context owns no state; it only lets explicit card chrome request that
 * the Canvas owner select one durable Resource node (or toggle it in the
 * bulk set).
 */
export const WorkspaceCanvasResourceSelectionContext = createContext<
  ((nodeId: string, request: WorkspaceCanvasResourceSelectRequest) => void) | null
>(null)
