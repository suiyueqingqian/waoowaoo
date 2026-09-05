'use client'

import { useState } from 'react'
import { AppIcon } from '@/components/ui/icons'
import type { UnifiedModelType } from '@/lib/ai-registry/types'
import { ModelSlotCard, type ModelSlotCardProps } from './ModelSlotCard'
import { MODEL_SLOT_PRESENTATION } from './model-slot-presentation'
import type { ModelSlotOption, ModelSlotSelection } from './hooks/useApiConfigFilters'

interface ExtensionMediaSectionProps
  extends Pick<ModelSlotCardProps, 'fixedParameterFields' | 'capabilityDefaults' | 'onSelect' | 'onFixedParameterChange' | 't'> {
  types: readonly UnifiedModelType[]
  getOptions: (type: UnifiedModelType) => ModelSlotOption[]
  getSelection: (type: UnifiedModelType) => ModelSlotSelection
}

/** Optional slots live in one collapsible bar so they never outrank the core three. */
export function ExtensionMediaSection(props: ExtensionMediaSectionProps) {
  const { types, getOptions, getSelection, t } = props
  const summaries = types.map((type) => {
    const selection = getSelection(type)
    const option = selection.modelKey
      ? getOptions(type).find((candidate) => candidate.modelKey === selection.modelKey)
      : undefined
    const value = option?.name
      ?? (selection.ambiguous ? t('modelSelectionRequired') : t('slotUnset'))
    return {
      type,
      active: selection.modelKey.length > 0,
      text: t('extensionModels.summaryItem', { type: t(MODEL_SLOT_PRESENTATION[type].typeLabel), model: value }),
    }
  })
  const [open, setOpen] = useState(() => summaries.some((summary) => summary.active))
  const contentId = 'extension-media-section'

  return (
    <section className="glass-surface glass-card-shadow-soft rounded-2xl">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-[var(--glass-bg-muted)]"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="glass-surface-soft inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--glass-text-secondary)]">
            <AppIcon name="package" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--glass-text-primary)]">{t('extensionModels.title')}</h2>
            <p className="truncate text-[12px] text-[var(--glass-text-tertiary)]">
              {open ? t('extensionModels.hint') : summaries.map((summary) => summary.text).join(' · ')}
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          {!open && summaries.filter((summary) => summary.active).map((summary) => (
            <span key={summary.type} className="glass-chip glass-chip-success hidden sm:inline-flex">
              <AppIcon name={MODEL_SLOT_PRESENTATION[summary.type].icon} className="h-3 w-3" />
              {t(MODEL_SLOT_PRESENTATION[summary.type].typeLabel)}
            </span>
          ))}
          <AppIcon name={open ? 'chevronUp' : 'chevronDown'} className="h-4 w-4 text-[var(--glass-text-secondary)]" />
        </span>
      </button>
      {open && (
        <div id={contentId} className="grid grid-cols-1 gap-4 border-t border-[var(--glass-stroke-base)] p-4 md:grid-cols-2">
          {types.map((type) => (
            <ModelSlotCard
              key={type}
              type={type}
              options={getOptions(type)}
              selection={getSelection(type)}
              onSelect={props.onSelect}
              t={t}
              fixedParameterFields={props.fixedParameterFields}
              capabilityDefaults={props.capabilityDefaults}
              onFixedParameterChange={props.onFixedParameterChange}
            />
          ))}
        </div>
      )}
    </section>
  )
}
