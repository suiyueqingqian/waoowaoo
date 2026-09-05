export interface CanvasRectangle {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** Reserve actual card bounds; every collision advances beyond an occupied bottom edge. */
export function vacantCanvasPosition(rect: CanvasRectangle, occupied: readonly CanvasRectangle[], gap = 32): { x: number; y: number } {
  let y = rect.y
  for (;;) {
    const collisions = occupied.filter((other) => rect.x < other.x + other.width + gap
      && rect.x + rect.width + gap > other.x
      && y < other.y + other.height + gap
      && y + rect.height + gap > other.y)
    if (collisions.length === 0) return { x: rect.x, y }
    y = Math.max(...collisions.map((other) => other.y + other.height + gap))
  }
}
