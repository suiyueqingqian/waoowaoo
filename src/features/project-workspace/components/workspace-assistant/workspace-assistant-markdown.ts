export type StreamedMarkdownNode = {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: StreamedMarkdownNode[]
}

const EXCLUDED_TAGS = new Set([
  'code', 'pre', 'script', 'style',
  'table', 'thead', 'tbody', 'tfoot', 'tr',
  'ul', 'ol', 'dl',
])
const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' })
const ANIMATED_TAIL_LENGTH = 256

function animateTail(node: StreamedMarkdownNode, budget: { remaining: number }): void {
  if (!node.children || EXCLUDED_TAGS.has(node.tagName ?? '')) return
  // Traverse from the end: one shared budget for the entire Markdown message,
  // not per paragraph. Old text stays intact as ordinary text nodes.
  for (let index = node.children.length - 1; index >= 0 && budget.remaining > 0; index -= 1) {
    const child = node.children[index]
    if (child.type !== 'text' || !child.value) {
      animateTail(child, budget)
      continue
    }
    let start = Math.max(0, child.value.length - budget.remaining)
    // Never split a UTF-16 surrogate pair at the animation boundary.
    const code = child.value.charCodeAt(start)
    if (start > 0 && code >= 0xDC00 && code <= 0xDFFF) start -= 1
    const tail = child.value.slice(start)
    budget.remaining = Math.max(0, budget.remaining - tail.length)
    const animated = Array.from(segmenter.segment(tail), ({ segment }): StreamedMarkdownNode => ({
      type: 'element', tagName: 'span',
      properties: { className: ['assistant-stream-in'] },
      children: [{ type: 'text', value: segment }],
    }))
    node.children.splice(index, 1,
      ...(start > 0 ? [{ ...child, value: child.value.slice(0, start) }] : []),
      ...animated,
    )
  }
}

export function animateStreamedMarkdown() {
  return (tree: StreamedMarkdownNode): void => animateTail(tree, { remaining: ANIMATED_TAIL_LENGTH })
}

export function normalizeAssistantMarkdown(text: string): string {
  return text.split(/(```[\s\S]*?```|`[^`\n]*`)/gu).map((segment, index) => {
    if (index % 2 !== 0) return segment
    const closedWithoutInnerSpace = segment.replace(
      /\*\*([^*\n]{1,80}?\S)\s+\*\*(?=\S)/gu,
      '**$1** ',
    )
    return closedWithoutInnerSpace.replace(
      /\*\*([^*\n]{1,80}?\S)\*\*(?=\S)/gu,
      '**$1** ',
    )
  }).join('')
}
