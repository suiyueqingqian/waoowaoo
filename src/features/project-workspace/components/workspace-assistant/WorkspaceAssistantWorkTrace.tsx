'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { WorkspaceAssistantMarkdown } from './MarkdownTextPart'
import { BuiToolIcon, resolveToolChipText, WorkspaceAssistantToolCallCard } from './WorkspaceAssistantToolCall'
import { AssistantContextCompactedDataCard } from './WorkspaceAssistantNotices'
import type { WorkspaceAssistantWorkTraceView } from './workspace-assistant-message-projection'

export const WorkspaceAssistantViewUnavailableContext = createContext(false)

function elapsedSeconds(startedAt: string | null, finishedAt: string | null): number | null {
  if (!startedAt || !finishedAt) return null
  const start = Date.parse(startedAt)
  const finish = Date.parse(finishedAt)
  return Number.isFinite(start) && Number.isFinite(finish) ? Math.max(0, Math.floor((finish - start) / 1000)) : null
}

/** Only the second-resolution label subscribes to the clock. The trace and
 * Markdown subtrees never rerender because another second elapsed. */
function WorkTraceStatus({ view }: { readonly view: WorkspaceAssistantWorkTraceView }) {
  const t = useTranslations('assistantAgent')
  const unavailable = useContext(WorkspaceAssistantViewUnavailableContext)
  const running = view.status === 'queued' || view.status === 'running'
  const [elapsed, setElapsed] = useState<number | null>(null)
  useEffect(() => {
    if (!running || unavailable) return
    const update = () => setElapsed(elapsedSeconds(view.startedAt, new Date().toISOString()))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [running, unavailable, view.startedAt])
  const seconds = running ? elapsed : elapsedSeconds(view.startedAt, view.finishedAt)
  const duration = seconds === null ? '' : seconds >= 60
    ? t('workTrace.durationMinutesSeconds', { minutes: Math.floor(seconds / 60), seconds: String(seconds % 60).padStart(2, '0') })
    : t('workTrace.durationSeconds', { seconds })
  const labelKey = unavailable && running ? 'unavailable'
    : view.status === 'queued' ? 'queued'
      : view.status === 'running' ? 'running'
        : view.status === 'waiting_approval' ? 'waiting'
          : view.classificationUnavailable ? 'classificationUnavailable'
            : view.status === 'completed' ? 'completed'
            : view.status === 'failed' ? 'failed'
              : view.status === 'cancelled' || view.status === 'interrupted' ? 'stopped' : 'history'
  return <span className={running && !unavailable ? 'wa-work-trace-shimmer' : undefined}>
    {t(`workTrace.${labelKey}`)}
    {duration && view.status !== 'continued' ? t('workTrace.withDuration', { duration }) : null}
  </span>
}

export function WorkspaceAssistantThinkingStatus({ label }: { readonly label?: string }) {
  const t = useTranslations('assistantAgent')
  const unavailable = useContext(WorkspaceAssistantViewUnavailableContext)
  return <div className="wa-work-trace-header" role="status" aria-live="polite">
    <BuiToolIcon icon="think" className="h-4 w-4 shrink-0 text-[var(--bui-ink-3)]" />
    <span className={unavailable ? undefined : 'wa-work-trace-shimmer'}>{label ?? t(unavailable ? 'workTrace.unavailable' : 'reasoning.running')}</span>
  </div>
}

function currentTraceAction(view: WorkspaceAssistantWorkTraceView): string | null {
  for (let index = view.entries.length - 1; index >= 0; index -= 1) {
    const entry = view.entries[index]
    if (entry.kind === 'tool' && entry.displayState === 'running') {
      const chip = resolveToolChipText(entry.toolName, entry.args)
      if (chip) return chip
    }
    if (entry.kind === 'commentary') return entry.text.split('\n').find((line) => line.trim()) ?? null
  }
  return null
}

export function WorkspaceAssistantWorkTrace({ data: view }: { readonly data: WorkspaceAssistantWorkTraceView }) {
  const unavailable = useContext(WorkspaceAssistantViewUnavailableContext)
  const running = view.status === 'queued' || view.status === 'running'
  const defaultExpanded = (running && !unavailable) || view.status === 'waiting_approval'
    || view.status === 'failed' || view.status === 'interrupted' || view.status === 'cancelled'
    || view.classificationUnavailable
  const [disclosure, setDisclosure] = useState<{ status: typeof view.status; expanded: boolean | null }>({ status: view.status, expanded: null })
  if (disclosure.status !== view.status) setDisclosure({ status: view.status, expanded: null })
  const expanded = (disclosure.status === view.status ? disclosure.expanded : null) ?? defaultExpanded
  // This owner survives unmounting the entire folded trace, like Horror.
  const [expandedTools, setExpandedTools] = useState<Readonly<Record<string, boolean>>>({})
  const setToolExpanded = useCallback((id: string, open: boolean) => {
    setExpandedTools((current) => ({ ...current, [id]: open }))
  }, [])
  const growingTextId = useMemo(() => [...view.entries].reverse().find((entry) =>
    entry.kind === 'reasoning' || entry.kind === 'commentary')?.id, [view.entries])
  const currentAction = running && !unavailable ? currentTraceAction(view) : null
  return <div className="wa-work-trace">
    <button className="wa-work-trace-header" type="button" aria-expanded={expanded}
      disabled={view.entries.length === 0}
      onClick={() => setDisclosure({ status: view.status, expanded: !expanded })}>
      <BuiToolIcon icon="think" className="h-4 w-4 shrink-0 text-[var(--bui-ink-3)]" />
      <WorkTraceStatus view={view} />
      {!expanded && currentAction ? <span className="wa-work-trace-current">{currentAction}</span> : null}
      {view.entries.length > 0 ? <AppIcon name="chevronDown" className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} /> : null}
    </button>
    {view.entries.length > 0 ? <div className="wa-work-trace-divider" aria-hidden="true" /> : null}
    <div className={`wa-work-trace-expand${expanded ? ' is-expanded' : ''}`} aria-hidden={!expanded}>
      <div className="wa-work-trace-overflow">
        <div className="wa-work-trace-rail">
          {expanded ? view.entries.map((entry) => {
            if (entry.kind === 'tool') return <WorkspaceAssistantToolCallCard key={entry.id} {...entry}
              manualExpanded={expandedTools[entry.id]} onExpandedChange={setToolExpanded} />
            if (entry.kind === 'compaction') return <AssistantContextCompactedDataCard key={entry.id} data={entry} />
            return <div key={entry.id} className={`wa-work-trace-text is-${entry.kind}`}>
              <WorkspaceAssistantMarkdown text={entry.text} running={running && !unavailable && entry.id === growingTextId} compact />
            </div>
          }) : null}
        </div>
      </div>
    </div>
  </div>
}
