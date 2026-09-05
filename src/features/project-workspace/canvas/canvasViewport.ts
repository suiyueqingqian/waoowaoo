export const DEFAULT_WORKSPACE_CANVAS_VIEWPORT = { x: 24, y: 136, zoom: 0.82 } as const
export const WORKSPACE_CANVAS_MIN_ZOOM = 0.0625
export const WORKSPACE_CANVAS_MAX_ZOOM = 2.5
export const WORKSPACE_CANVAS_WHEEL_ZOOM_SPEED = 0.0018

export function clampWorkspaceCanvasZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DEFAULT_WORKSPACE_CANVAS_VIEWPORT.zoom
  return Math.min(WORKSPACE_CANVAS_MAX_ZOOM, Math.max(WORKSPACE_CANVAS_MIN_ZOOM, zoom))
}

export function getNextWorkspaceCanvasWheelZoom(currentZoom: number, wheelDeltaY: number): number {
  const safeCurrentZoom = clampWorkspaceCanvasZoom(currentZoom)
  return clampWorkspaceCanvasZoom(safeCurrentZoom * Math.exp(-wheelDeltaY * WORKSPACE_CANVAS_WHEEL_ZOOM_SPEED))
}
