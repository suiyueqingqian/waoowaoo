'use client'

import { useTranslations } from 'next-intl'
import type { CapabilityValue } from '@/lib/ai-registry/types'
import type { WorkspaceCanvasGenerationParameterView } from '@/lib/workspace-resource/canvas-generation-capabilities'
import { SELECTABLE_TEXT_CLASS } from '../nodes/renderers/renderer-shared'

function encode(value: CapabilityValue): string {
  return `${typeof value}:${String(value)}`
}

function decode(encoded: string, options: readonly CapabilityValue[]): CapabilityValue | undefined {
  return options.find((option) => encode(option) === encoded)
}

/**
 * One select per user-choosable model parameter (resolution, quality, audio),
 * options straight from the capability View. Required fields have no implicit default.
 */
export function GenerationParameterFields({
  parameters,
  values,
  disabled,
  onChange,
}: {
  readonly parameters: readonly WorkspaceCanvasGenerationParameterView[]
  readonly values: Readonly<Record<string, CapabilityValue>>
  readonly disabled: boolean
  readonly onChange: (field: string, value: CapabilityValue | undefined) => void
}) {
  const t = useTranslations('projectWorkflow.canvas.workspace.create')
  if (parameters.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {parameters.map((parameter) => {
        const current = values[parameter.field]
        return (
          <label key={parameter.field} className="flex items-center gap-2 text-[11px] font-medium text-[var(--glass-text-secondary)]">
            <span className={SELECTABLE_TEXT_CLASS}>{t(`parameter.${parameter.field}`)}</span>
            <select
              value={current === undefined || !parameter.options.includes(current) ? '' : encode(current)}
              disabled={disabled}
              className="nodrag h-8 rounded-[9px] border border-transparent bg-white/80 px-2 text-xs text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white disabled:opacity-60"
              onMouseDown={(event) => event.stopPropagation()}
              onChange={(event) => onChange(parameter.field, event.target.value ? decode(event.target.value, parameter.options) : undefined)}
            >
              <option value="" disabled={parameter.required}>{t(parameter.required ? 'parameterRequired' : 'parameterDefault')}</option>
              {parameter.options.map((option) => (
                <option key={encode(option)} value={encode(option)}>
                  {typeof option === 'boolean' ? t(option ? 'parameterValue.on' : 'parameterValue.off') : String(option)}
                </option>
              ))}
            </select>
          </label>
        )
      })}
    </div>
  )
}
