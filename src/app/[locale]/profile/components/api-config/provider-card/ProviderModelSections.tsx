'use client'

import { AppIcon } from '@/components/ui/icons'
import type { UnifiedModelType } from '@/lib/ai-registry/types'
import { MODEL_SLOT_PRESENTATION } from '../../api-config-tab/model-slot-presentation'
import { MODEL_SLOT_TYPES } from '@/lib/ai-registry/media-model-selection'
import { ModelRow } from './ModelRow'
import type { UseProviderCardStateResult } from './hooks/useProviderCardState'
import type { ProviderCardProps, ProviderCardTranslator } from './types'

interface ProviderModelSectionsProps {
  provider: ProviderCardProps['provider']
  onDeleteModel: ProviderCardProps['onDeleteModel']
  onUpdateModel: ProviderCardProps['onUpdateModel']
  t: ProviderCardTranslator
  state: UseProviderCardStateResult
}

/** Every model type of a provider stacked vertically; nothing hides behind a tab. */
export function ProviderModelSections(props: ProviderModelSectionsProps) {
  const { provider, t, state } = props
  const types = MODEL_SLOT_TYPES.filter(
    (type) => provider.modelTypes?.includes(type) || state.groupedModels[type]?.length,
  )

  return (
    <div className="space-y-4 px-4 pb-4 pt-1">
      {types.map((type: UnifiedModelType) => {
        const presentation = MODEL_SLOT_PRESENTATION[type]
        const models = state.groupedModels[type] ?? []
        return (
          <section key={type} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h4 className="flex items-center gap-2 text-xs font-semibold text-[var(--glass-text-primary)]">
                <AppIcon name={presentation.icon} className="h-3.5 w-3.5" />
                {t(presentation.typeLabel)}
                <span className="font-normal text-[var(--glass-text-tertiary)]">{models.length}</span>
              </h4>
              {provider.modelTypes?.includes(type) && state.showAddForm !== type && (
                <button
                  type="button"
                  onClick={() => state.setShowAddForm(type)}
                  className="glass-btn-base glass-btn-soft px-2 py-1 text-xs"
                >
                  <AppIcon name="plus" className="h-3.5 w-3.5" />
                  {t('add')}
                </button>
              )}
            </div>
            {state.showAddForm === type && (
              <form
                className="glass-surface-soft space-y-3 rounded-xl p-3"
                onSubmit={(event) => { event.preventDefault(); void state.handleAddModel(type) }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={state.newModel.name}
                    onChange={(event) => state.setNewModel({ ...state.newModel, name: event.target.value })}
                    placeholder={t('modelDisplayName')}
                    aria-label={t('modelDisplayName')}
                    className="glass-input-base min-w-0 flex-1 px-3 py-2 text-xs"
                    autoFocus
                  />
                  <input
                    value={state.newModel.modelId}
                    onChange={(event) => state.setNewModel({ ...state.newModel, modelId: event.target.value })}
                    placeholder={t('modelActualId')}
                    aria-label={t('modelActualId')}
                    className="glass-input-base min-w-0 flex-1 px-3 py-2 font-mono text-xs"
                  />
                  <button type="submit" disabled={state.isModelSavePending} className="glass-btn-base glass-btn-primary px-3 py-2 text-xs">
                    {state.isModelSavePending ? t('saving') : t('save')}
                  </button>
                  <button type="button" onClick={state.handleCancelAdd} className="glass-icon-btn-sm" aria-label={t('cancel')}>
                    <AppIcon name="close" className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
            {models.length === 0 ? (
              <p className="px-1 text-[12px] text-[var(--glass-text-tertiary)]">{t('noModelsForProvider')}</p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-2">
                {models.map((model) => (
                  <ModelRow
                    key={model.modelKey}
                    model={model}
                    t={t}
                    state={state}
                    onDeleteModel={props.onDeleteModel}
                    onUpdateModel={props.onUpdateModel}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
