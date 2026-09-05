'use client'

import { useTranslations } from 'next-intl'

export function GenerationFormIssues({ issues, onReviewConfiguration }: {
  readonly issues: readonly string[]
  readonly onReviewConfiguration: () => void
}) {
  const t = useTranslations('projectWorkflow.canvas.workspace.create')
  if (issues.length === 0) return null
  return (
    <div className="mt-2 space-y-1 rounded-xl bg-[var(--glass-tone-warning-bg)] px-3 py-2 text-[11px] leading-4 text-[var(--glass-text-secondary)]" role="status">
      {issues.map((code) => <p key={code}>{t(`validation.${code}`)}</p>)}
      {issues.includes('CONFIGURATION_CHANGED') ? (
        <button type="button" className="nodrag mt-1 underline" onClick={onReviewConfiguration}>{t('reviewConfiguration')}</button>
      ) : null}
    </div>
  )
}
