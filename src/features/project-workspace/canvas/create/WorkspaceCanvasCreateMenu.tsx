'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon, type AppIconName } from '@/components/ui/icons'
import type { CanvasDraftMediaType } from './canvas-draft'

const MENU_WIDTH = 200

const CREATE_ENTRIES: readonly { readonly mediaType: CanvasDraftMediaType; readonly icon: AppIconName }[] = [
  { mediaType: 'image', icon: 'image' },
  { mediaType: 'video', icon: 'video' },
]

/**
 * The double-click menu on empty Canvas: start an AI-drafted image or video
 * here, or upload material here. Pure UI; nothing persists until a draft is
 * submitted or an upload lands.
 */
export function WorkspaceCanvasCreateMenu({
  position,
  onCreate,
  onUpload,
  onClose,
}: {
  readonly position: { readonly x: number; readonly y: number }
  readonly onCreate: (mediaType: CanvasDraftMediaType) => void
  readonly onUpload: () => void
  readonly onClose: () => void
}) {
  const t = useTranslations('projectWorkflow.canvas.workspace.create')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || menuRef.current?.contains(event.target)) return
      onClose()
    }
    window.addEventListener('pointerdown', closeOnOutsidePointerDown, true)
    return () => window.removeEventListener('pointerdown', closeOnOutsidePointerDown, true)
  }, [onClose])

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    onClose()
  }

  const entryClass = 'flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-left text-sm font-medium text-[var(--glass-text-primary)] transition hover:bg-slate-100'
  const iconClass = 'inline-flex h-7 w-7 items-center justify-center rounded-[10px] bg-slate-100 text-[var(--glass-text-secondary)]'

  return (
    <div
      ref={menuRef}
      className="nodrag nopan pointer-events-auto absolute"
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, width: MENU_WIDTH, zIndex: 50 }}
      onClick={(event) => event.stopPropagation()}
      onMouseDownCapture={(event) => event.stopPropagation()}
      onKeyDown={closeOnEscape}
    >
      <div className="rounded-[18px] border border-slate-200 bg-white/96 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--glass-text-tertiary)]">
          {t('menuTitle')}
        </p>
        <div className="space-y-0.5">
          {CREATE_ENTRIES.map((entry, index) => (
            <button
              key={entry.mediaType}
              type="button"
              className={entryClass}
              autoFocus={index === 0}
              onClick={() => onCreate(entry.mediaType)}
            >
              <span className={iconClass}>
                <AppIcon name={entry.icon} className="h-3.5 w-3.5" />
              </span>
              {t(entry.mediaType)}
            </button>
          ))}
          <button type="button" className={entryClass} onClick={onUpload}>
            <span className={iconClass}>
              <AppIcon name="upload" className="h-3.5 w-3.5" />
            </span>
            {t('upload')}
          </button>
        </div>
      </div>
    </div>
  )
}
