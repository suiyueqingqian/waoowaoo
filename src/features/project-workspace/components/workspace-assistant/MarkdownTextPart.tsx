'use client'

import React, { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { TextMessagePartProps } from '@assistant-ui/react'
import type { Components } from 'react-markdown'
import { readSourceDomain, WebSourceFavicon } from './WebSourceFavicon'
import { animateStreamedMarkdown, normalizeAssistantMarkdown } from './workspace-assistant-markdown'
import {
  projectWorkspacePathFromHref,
  useWorkspaceAssistantWorkspaceLink,
} from './workspace-assistant-workspace-link'

function isExternalWebHref(href: string): boolean {
  try {
    const url = new URL(href)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function WorkspaceMarkdownLink(props: { readonly href?: string; readonly children?: React.ReactNode }) {
  const workspaceLink = useWorkspaceAssistantWorkspaceLink()
  const href = props.href?.trim() ?? ''
  if (isExternalWebHref(href)) {
    // Beautiful UI SourceChip: a quiet inline pill carrying the site's icon and
    // domain in 10.5px mono, so several citations stay readable in one line.
    const domain = readSourceDomain(href)
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={href}
        className="ml-0 mr-1 inline-flex h-[18px] max-w-[16rem] translate-y-[-1px] items-center gap-1 rounded-[5px] bg-[var(--bui-inset)] px-[3px] align-middle font-mono text-[11.5px] leading-none text-[var(--bui-ink-2)] no-underline shadow-[var(--bui-shadow-hairline)] transition-colors duration-150 hover:bg-[var(--bui-hover)] hover:text-[var(--bui-ink)]"
      >
        <WebSourceFavicon domain={domain} className="h-3 w-3 shrink-0 rounded-[3px]" />
        <span className="truncate">{domain}</span>
      </a>
    )
  }
  const workspacePath = projectWorkspacePathFromHref(href)
  if (workspaceLink && workspacePath) {
    return (
      <button
        type="button"
        className="break-words text-left text-[var(--glass-accent-from)] underline underline-offset-2 [overflow-wrap:anywhere]"
        onClick={() => workspaceLink.openWorkspacePath(workspacePath)}
      >
        {props.children}
      </button>
    )
  }
  return <span className="break-words text-[var(--glass-text-tertiary)]">{props.children}</span>
}

const markdownComponents: Components = {
  a: WorkspaceMarkdownLink,
  table: ({ children }) => (
    <div className="wa-markdown-table">
      <table>{children}</table>
    </div>
  ),
}

function WorkspaceAssistantMarkdownImpl({ text, running, compact = false }: {
  readonly text: string
  readonly running: boolean
  readonly compact?: boolean
}) {
  if (!text) return null
  return (
    <div className={`workspace-assistant-markdown${compact ? ' wa-work-trace-markdown' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={running ? [animateStreamedMarkdown] : []}
        components={markdownComponents}
      >
        {normalizeAssistantMarkdown(text)}
      </ReactMarkdown>
    </div>
  )
}

export const WorkspaceAssistantMarkdown = memo(WorkspaceAssistantMarkdownImpl)

export function MarkdownTextPart({ text, status }: Pick<TextMessagePartProps, 'text' | 'status'>) {
  return <WorkspaceAssistantMarkdown text={text} running={status.type === 'running'} />
}
