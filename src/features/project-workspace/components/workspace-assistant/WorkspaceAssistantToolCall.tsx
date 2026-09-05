'use client'

import { useLocale, useTranslations } from 'next-intl'
import { memo, useEffect, useRef, useState } from 'react'
import { WebSourceFavicon } from './WebSourceFavicon'
import { localizeProjectAgentOperationTitle } from '@/lib/project-agent/copy'
import { normalizeProjectAgentLocale } from '@/lib/project-agent/locale'
import { resolveUnifiedErrorCode, type UnifiedErrorCode } from '@/lib/errors/codes'
import {
  parseCreativeRuntimeSkillReadToolName,
} from '@/lib/creative-skills/runtime-skill-read'
import type { WorkspaceAssistantToolCallDisplayState } from './workspace-assistant-run-trace'
import type { WorkspaceAssistantTraceTool } from './workspace-assistant-message-projection'

type AssistantAgentTranslator = ReturnType<typeof useTranslations<'assistantAgent'>>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function readPublicWebUrl(value: unknown): string | null {
  const raw = readText(value)
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

/** Read only the canonical error projection carried by a failed tool result. */
function resolveToolFailureCode(result: unknown): UnifiedErrorCode | null {
  if (!isRecord(result) || result.ok !== false) return null
  const error = isRecord(result.error) ? result.error : null
  const details = isRecord(error?.details) ? error.details : null
  const failure = isRecord(details?.failure) ? details.failure : null
  return resolveUnifiedErrorCode(failure?.code)
    ?? resolveUnifiedErrorCode(error?.code)
}

type ToolFailureCorrection = {
  readonly action: 'add_required_field' | 'fix_invalid_value' | 'move_unknown_field' | 'remove_unknown_field'
  readonly field: string
  readonly issueCode: string | null
  readonly target: string | null
  readonly allowedValues: readonly string[]
}

const TOOL_FAILURE_CORRECTION_ACTIONS = new Set<ToolFailureCorrection['action']>([
  'add_required_field',
  'fix_invalid_value',
  'move_unknown_field',
  'remove_unknown_field',
])

function resolveToolFailureCorrection(result: unknown): ToolFailureCorrection | null {
  if (!isRecord(result) || result.ok !== false) return null
  const error = isRecord(result.error) ? result.error : null
  const details = isRecord(error?.details) ? error.details : null
  const first = Array.isArray(details?.corrections) && isRecord(details.corrections[0])
    ? details.corrections[0]
    : null
  const field = readText(first?.fieldPath)
  const action = readText(first?.action)
  if (!field || !action || !TOOL_FAILURE_CORRECTION_ACTIONS.has(action as ToolFailureCorrection['action'])) return null
  const allowedValues = Array.isArray(first?.allowedValues)
    ? first.allowedValues.flatMap((value) => (
        value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? [String(value)]
          : []
      ))
    : []
  return {
    action: action as ToolFailureCorrection['action'],
    field,
    issueCode: readText(first?.issueCode),
    target: readText(first?.targetPath),
    allowedValues,
  }
}

function translateToolFailureCorrection(
  correction: ToolFailureCorrection,
  t: AssistantAgentTranslator,
): string {
  if (correction.action === 'add_required_field') {
    return t('toolCall.validationMissing', { field: correction.field })
  }
  if (correction.action === 'move_unknown_field' && correction.target) {
    return t('toolCall.validationMove', { field: correction.field, target: correction.target })
  }
  if (correction.action === 'remove_unknown_field') {
    return t('toolCall.validationUnsupported', { field: correction.field })
  }
  if (correction.allowedValues.length > 0) {
    return t('toolCall.validationAllowedValues', {
      field: correction.field,
      values: correction.allowedValues.join(', '),
    })
  }
  if (correction.issueCode === 'invalid_type') {
    return t('toolCall.validationInvalidType', { field: correction.field })
  }
  if (correction.issueCode === 'too_small') {
    return t('toolCall.validationTooSmall', { field: correction.field })
  }
  if (correction.issueCode === 'too_big') {
    return t('toolCall.validationTooBig', { field: correction.field })
  }
  return t('toolCall.validationInvalid', { field: correction.field })
}

function resolveToolFailureReason(result: unknown): { field: string | null; reasonCode: string } | null {
  if (!isRecord(result) || result.ok !== false) return null
  const error = isRecord(result.error) ? result.error : null
  const details = isRecord(error?.details) ? error.details : null
  const reasonCode = readText(details?.reasonCode)
  if (!reasonCode) return null
  return { field: readText(details?.field), reasonCode }
}

/* eslint-disable no-restricted-syntax -- Beautiful UI's copied tool glyphs, preserved exactly. */
const BUI_TOOL_ICONS = {
  think: <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />,
  write: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></g>,
  run: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17l6-5-6-5M12 19h8" /></g>,
  read: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></g>,
  globe: <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></g>,
} as const

type BuiToolIconName = keyof typeof BUI_TOOL_ICONS

function resolveBuiToolIcon(params: {
  readonly toolName: string
  readonly runtimeSkillRead: boolean
}): BuiToolIconName {
  if (params.runtimeSkillRead) return 'read'
  switch (params.toolName) {
    case 'file_change':
      return 'write'
    case 'web_search':
      return 'globe'
    case 'view_image':
      return 'read'
    default:
      return 'run'
  }
}

export function BuiToolIcon({ icon, className }: { readonly icon: BuiToolIconName; readonly className: string }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      className={className}
      fill={icon === 'think' ? 'currentColor' : 'none'}
      stroke="currentColor"
      aria-hidden="true"
    >
      {BUI_TOOL_ICONS[icon]}
    </svg>
  )
}

function BuiSearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bui-ink-3)" strokeWidth="2" strokeLinecap="round" className="shrink-0" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}
/* eslint-enable no-restricted-syntax */

/** Detail lines behind a row, in Beautiful UI's expandable-trace grammar. */
function resolveToolDetailLines(result: unknown): string[] {
  if (!isRecord(result)) return []
  const output = result.output
  if (typeof output === 'string' && output.trim()) {
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4)
  }
  if (Array.isArray(result.changes)) {
    return result.changes.flatMap((change) =>
      isRecord(change) && typeof change.path === 'string' ? [change.path] : [],
    ).slice(0, 4)
  }
  const summary = result.summary ?? result.message
  if (typeof summary === 'string' && summary.trim()) return [summary]
  return []
}

/** The mono chip beside a tool row: the command or file paths. */
export function resolveToolChipText(toolName: string, args: unknown): string | null {
  if (!isRecord(args)) return null
  // The search query renders inside the Search trace rows, not as a chip.
  if (toolName === 'web_search') return null
  const command = args.command
  if (typeof command === 'string' && command.trim()) return command
  if (Array.isArray(command) && command.every((item) => typeof item === 'string')) {
    const joined = command.join(' ').trim()
    if (joined) return joined
  }
  if (Array.isArray(args.changes)) {
    const paths = args.changes.flatMap((change) =>
      isRecord(change) && typeof change.path === 'string' ? [change.path.split('/').pop() ?? change.path] : [],
    )
    if (paths.length > 0) return paths.join(', ')
  }
  const path = args.path
  if (typeof path === 'string' && path.trim()) return path
  return null
}

function resolveNativeToolTitle(toolName: string, t: AssistantAgentTranslator): string | null {
  switch (toolName) {
    case 'shell': return t('runtime.native.shell')
    case 'file_change': return t('runtime.native.fileChange')
    case 'web_search': return t('runtime.native.webSearch')
    case 'view_image': return t('runtime.native.viewImage')
    case 'wao.request_user_decision': return t('runtime.native.userDecision')
    default: return null
  }
}

export type WebSearchSource = {
  readonly url: string
  readonly title: string
  readonly domain: string
  readonly previewImageUrl: string | null
}

/** Reads native standalone-search results from the completed Codex item. */
export function resolveWebSearchSources(result: unknown): WebSearchSource[] {
  const output = isRecord(result) ? result : null
  if (!Array.isArray(output?.results)) return []
  const previewBySourceUrl = new Map<string, string>()
  for (const entry of output.results) {
    if (!isRecord(entry) || entry.type !== 'image_result') continue
    const sourceUrl = readPublicWebUrl(entry.source_url)
    const imageUrl = readPublicWebUrl(entry.image_url)
    if (sourceUrl && imageUrl && !previewBySourceUrl.has(sourceUrl)) {
      previewBySourceUrl.set(sourceUrl, imageUrl)
    }
  }
  const byUrl = new Map<string, WebSearchSource>()
  for (const entry of output.results) {
    if (!isRecord(entry)) continue
    const url = entry.type === 'image_result'
      ? readPublicWebUrl(entry.source_url)
      : readPublicWebUrl(entry.url)
    if (!url || byUrl.has(url)) continue
    try {
      const domain = readText(entry.source_domain)
        ?? new URL(url).hostname.replace(/^www\./, '')
      byUrl.set(url, {
        url,
        title: readText(entry.title) ?? domain,
        domain,
        previewImageUrl: previewBySourceUrl.get(url) ?? null,
      })
    } catch {}
  }
  return [...byUrl.values()].slice(0, 6)
}

function resolveWebSearchQuery(args: unknown): string | null {
  if (!isRecord(args)) return null
  const direct = readText(args.query)
  if (direct) return direct
  const action = isRecord(args.action) ? args.action : null
  const actionQuery = readText(action?.query)
  if (actionQuery) return actionQuery
  if (!Array.isArray(action?.queries)) return null
  const queries = action.queries.flatMap((query) => {
    const value = readText(query)
    return value ? [value] : []
  })
  return queries.length > 0 ? queries.join(' · ') : null
}

function translateDisplayState(
  state: WorkspaceAssistantToolCallDisplayState,
  t: ReturnType<typeof useTranslations<'assistantAgent'>>,
): string {
  switch (state) {
    case 'success':
      return t('toolCall.success')
    case 'submitted':
      return t('toolCall.submitted')
    case 'failed':
      return t('toolCall.failed')
    case 'interrupted':
      return t('toolCall.interrupted')
    case 'running':
      return t('toolCall.running')
    case 'needsAction':
      return t('toolCall.needsAction')
  }
}

/**
 * Seconds a still-running row has been running.
 *
 * A long tool call must prove it is alive on its own. Making that proof depend
 * on provider progress events was the earlier mistake: when they did not
 * arrive, a research call sat on one static line for minutes and read as
 * frozen. A local clock cannot fail to arrive.
 */
function useRunningSeconds(running: boolean): number {
  const startedAtRef = useRef<number | null>(null)
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!running) {
      startedAtRef.current = null
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset the display clock together with its interval subscription.
      setSeconds(0)
      return
    }
    startedAtRef.current ??= Date.now()
    const tick = (): void => {
      const startedAt = startedAtRef.current
      if (startedAt !== null) setSeconds(Math.floor((Date.now() - startedAt) / 1_000))
    }
    tick()
    const timer = window.setInterval(tick, 1_000)
    return () => window.clearInterval(timer)
  }, [running])
  return seconds
}

function ToolRunningTime({ running }: { readonly running: boolean }) {
  const t = useTranslations('assistantAgent')
  const seconds = useRunningSeconds(running)
  const duration = seconds < 60 ? t('workTrace.durationSeconds', { seconds })
    : t('workTrace.durationMinutesSeconds', { minutes: Math.floor(seconds / 60), seconds: String(seconds % 60).padStart(2, '0') })
  return seconds > 0 ? <span className="shrink-0 font-mono text-[12.5px] tabular-nums text-[var(--bui-ink-3)]">{duration}</span> : null
}

function WorkspaceAssistantToolCallCardImpl(props: WorkspaceAssistantTraceTool & {
  readonly manualExpanded: boolean | undefined
  readonly onExpandedChange: (id: string, expanded: boolean) => void
}) {
  const t = useTranslations('assistantAgent')
  const tErrors = useTranslations('errors')
  const locale = normalizeProjectAgentLocale(useLocale())
  const runtimeSkillId = parseCreativeRuntimeSkillReadToolName(props.toolName)
  const operationId = props.toolName.startsWith('wao.')
    ? props.toolName.slice('wao.'.length)
    : props.toolName
  const operationTitle = runtimeSkillId
    ? t('runtime.native.skillRead', {
        skill: t(`runtime.native.skillNames.${runtimeSkillId}`),
      })
    : resolveNativeToolTitle(props.toolName, t)
      ?? localizeProjectAgentOperationTitle(operationId, locale)
  const displayState = props.displayState
  const running = displayState === 'running'
  const failed = displayState === 'failed'
  const interrupted = displayState === 'interrupted'
  const summaryText = translateDisplayState(displayState, t)
  const failureCode = resolveToolFailureCode(props.result)
  const failureCorrection = resolveToolFailureCorrection(props.result)
  const failureReason = resolveToolFailureReason(props.result)
  let failureDetail = failureCode && tErrors.has(failureCode)
    ? tErrors(failureCode)
    : t('toolCall.failedDetail')
  if (failureReason) {
    failureDetail = tErrors.has(failureReason.reasonCode as UnifiedErrorCode)
      ? tErrors(failureReason.reasonCode as UnifiedErrorCode)
      : failureReason.field
        ? t('toolCall.reasonFieldDetail', {
            field: failureReason.field,
            reasonCode: failureReason.reasonCode,
          })
        : t('toolCall.reasonDetail', { reasonCode: failureReason.reasonCode })
  }
  if (failureCorrection) {
    failureDetail = translateToolFailureCorrection(failureCorrection, t)
  }
  const buiIcon = resolveBuiToolIcon({
    toolName: props.toolName,
    runtimeSkillRead: runtimeSkillId !== null,
  })
  const displayTitle = operationTitle
  const webSearchSources = operationId === 'web_search'
    ? resolveWebSearchSources(props.result)
    : []
  // Codex 0.146 starts standalone Web Search with an empty query/action and
  // fills both only on item/completed. Keep the completed brief visible beside
  // its native result pages; the running row must not invent unavailable data.
  const webSearchQuery = operationId === 'web_search'
    ? resolveWebSearchQuery(props.args)
    : null
  const chipText = resolveToolChipText(props.toolName, props.args)
  const troubled = failed || interrupted
  // Beautiful UI ToolChips row grammar: glyph + medium title + inline chip;
  // the row expands to detail lines behind a hairline left rail. Success is
  // implied by the quiet row; every non-success state stays explicit.
  const stateSuffix = displayState === 'success' ? null : summaryText
  const detailLines = resolveToolDetailLines(props.result)
  const isSearch = operationId === 'web_search'
  const hasSearchTrace = isSearch && Boolean(webSearchQuery || webSearchSources.length > 0)
  // The search trace stays live while the call runs, then settles collapsed
  // like every other trace; the row click reopens it.
  const detailOpen = props.manualExpanded ?? (failed || (running && (isSearch || Boolean(props.progress))))
  const hasDetail = detailLines.length > 0 || failed || hasSearchTrace || Boolean(props.progress)
  return (
    <div className="w-full min-w-0 text-sm leading-5">
      <div className="flex min-h-7 min-w-0 items-center gap-2">
        <button
          type="button"
          aria-expanded={detailOpen}
          onClick={() => props.onExpandedChange(props.id, !detailOpen)}
          disabled={!hasDetail}
          className={`-mx-1.5 flex w-fit shrink-0 items-center gap-2 rounded-[8px] px-1.5 py-1 text-left transition-colors duration-100 ${hasDetail ? 'hover:bg-[var(--bui-hover-2)]' : 'cursor-default'}`}
        >
          <span className={`flex size-4 shrink-0 items-center justify-center ${troubled ? 'text-[var(--bui-red)]' : 'text-[var(--bui-ink-3)]'}`}>
            <BuiToolIcon icon={buiIcon} className="shrink-0" />
          </span>
          <span className={`text-[13.5px] font-medium ${troubled ? 'text-[var(--bui-red)]' : 'text-[var(--bui-ink)]'}`}>
            {displayTitle}
            {stateSuffix ? (
              <span className={troubled ? '' : 'text-[var(--bui-ink-3)]'}> · {stateSuffix}</span>
            ) : null}
          </span>
          {hasDetail ? (
            /* eslint-disable-next-line no-restricted-syntax -- Beautiful UI's copied chevron glyph, preserved exactly. */
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bui-ink-3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              className="shrink-0 transition-transform duration-300"
              style={{ transform: detailOpen ? 'rotate(180deg)' : 'rotate(0)' }}
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          ) : null}
        </button>
        {chipText ? (
          <span
            title={chipText}
            className="inline-flex h-6 min-w-0 flex-1 items-center truncate rounded-[6px] bg-[var(--bui-hover-2)] px-1.5 font-mono text-[12.5px] text-[#43464c] shadow-[var(--bui-shadow-hairline)]"
          >
            <span className="truncate">{chipText}</span>
          </span>
        ) : null}
        <ToolRunningTime running={running} />
      </div>

      {/* expanded detail — Beautiful UI trace rail */}
      {hasDetail && detailOpen ? (
        <div
          className="grid transition-[grid-template-rows,opacity] duration-300"
          style={{
            gridTemplateRows: detailOpen ? '1fr' : '0fr',
            opacity: detailOpen ? 1 : 0,
            transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mt-0.5 mb-1 ml-2 flex flex-col gap-0.5 border-l border-[var(--bui-line)] py-0.5 pl-3.5">
              {detailLines.map((line, index) => (
                <span
                  key={`${line}-${index}`}
                  className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.6] text-[var(--bui-ink-2)] [overflow-wrap:anywhere]"
                  title={line}
                >
                  {line}
                </span>
              ))}
              {props.progress ? (
                <span className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.6] text-[var(--bui-ink-2)] [overflow-wrap:anywhere]">{props.progress}</span>
              ) : null}
              {failed ? (
                <span className="text-[12.5px] leading-[1.6] text-[var(--bui-red)]">
                  {failureDetail}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* web search — Beautiful UI Search trace: query row + source rows */}
      {hasSearchTrace && detailOpen ? (
        <div
          className="grid transition-[grid-template-rows,opacity] duration-300"
          style={{
            gridTemplateRows: detailOpen ? '1fr' : '0fr',
            opacity: detailOpen ? 1 : 0,
            transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="relative mt-1 ml-[5px] pl-4">
              <span aria-hidden="true" className="absolute inset-y-1 left-[3px] w-px bg-[var(--bui-line)]" />
              <div className="flex flex-col gap-1 py-1">
                {webSearchQuery ? (
                  <div className="flex h-6 items-center gap-2 px-1.5">
                    <BuiSearchGlyph />
                    <span className="min-w-0 truncate text-[13.5px] text-[var(--bui-ink-2)]" title={webSearchQuery}>
                      {webSearchQuery}
                    </span>
                  </div>
                ) : null}
                {webSearchSources.map((source, index) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-7 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left transition-colors duration-150 hover:bg-[var(--bui-hover)]"
                    style={{ animation: `wa-bui-fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${String(index * 120)}ms both` }}
                  >
                    <WebSourceFavicon domain={source.domain} className="h-3.5 w-3.5 shrink-0 rounded-full" />
                    <span className="wa-bui-underline min-w-0 truncate text-[13.5px] font-medium text-[var(--bui-ink)]">
                      {source.title}
                    </span>
                    <span className="shrink-0 text-[12.5px] text-[var(--bui-ink-3)]">
                      {source.domain}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export const WorkspaceAssistantToolCallCard = memo(WorkspaceAssistantToolCallCardImpl)
