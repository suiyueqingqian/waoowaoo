'use client'

import { RatioPreviewIcon } from '@/components/ui/icons/RatioPreviewIcon'

/**
 * Picture-first frame choice. The choices come from the configured model's
 * capability View, never from a fixed list, so a user can only pick a frame
 * the model accepts.
 */
export function AspectRatioPicker({
  choices,
  value,
  onChange,
  disabled = false,
  label,
}: {
  readonly choices: readonly string[]
  readonly value: string | null
  readonly onChange: (ratio: string) => void
  readonly disabled?: boolean
  readonly label: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label={label}>
      {choices.map((ratio) => {
        const selected = ratio === value
        return (
          <button
            key={ratio}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={ratio}
            title={ratio}
            disabled={disabled}
            className={`nodrag inline-flex h-8 w-9 items-center justify-center rounded-[9px] transition disabled:cursor-not-allowed disabled:opacity-50 ${
              selected
                ? 'bg-white shadow-sm ring-1 ring-slate-300'
                : 'hover:bg-white/70'
            }`}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onChange(ratio)
            }}
          >
            <RatioPreviewIcon ratio={ratio} size={18} selected={selected} variant="muted" radiusClassName="rounded-[3px]" />
          </button>
        )
      })}
    </div>
  )
}
