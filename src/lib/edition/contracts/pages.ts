import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/routing'

export interface LocalizedEditionPageProps {
  readonly params: Promise<{ readonly locale: Locale }>
}

export type LocalizedEditionPageRenderer = (
  props: LocalizedEditionPageProps,
) => Promise<ReactNode>

export interface EditionPagesContract {
  readonly pricing: LocalizedEditionPageRenderer
  readonly contact: LocalizedEditionPageRenderer
  readonly privacy: LocalizedEditionPageRenderer
  readonly terms: LocalizedEditionPageRenderer
  readonly refundPolicy: LocalizedEditionPageRenderer
}
