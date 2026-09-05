const WORKSPACE_CANVAS_INTERACTION_ATTRIBUTE = 'data-workspace-canvas-interaction'
const WORKSPACE_CANVAS_IMAGE_PREVIEW_INTERACTION = 'image-preview'

/**
 * Shared DOM marker for the image-preview surface inside a ReactFlow node.
 * The renderer opens the preview; the Canvas selection owner consumes the
 * same marker so that one pointer intent cannot also open node details.
 */
export const workspaceCanvasImagePreviewTargetProps = {
  [WORKSPACE_CANVAS_INTERACTION_ATTRIBUTE]: WORKSPACE_CANVAS_IMAGE_PREVIEW_INTERACTION,
} as const

export function isWorkspaceCanvasImagePreviewTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest(
    `[${WORKSPACE_CANVAS_INTERACTION_ATTRIBUTE}="${WORKSPACE_CANVAS_IMAGE_PREVIEW_INTERACTION}"]`,
  ) !== null
}

const EDITABLE_TAG_NAMES = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * True when a keyboard event originates inside a text control (the details
 * editor, the draft brief, search). Canvas shortcuts must never steal keys
 * from typing.
 */
export function isWorkspaceCanvasEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (EDITABLE_TAG_NAMES.has(target.tagName) || target.isContentEditable) return true
  return target.closest('input, textarea, select, [contenteditable="true"]') !== null
}
