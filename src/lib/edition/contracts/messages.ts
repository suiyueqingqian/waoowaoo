import type { Locale } from '@/i18n/routing'

export interface EditionMessageTree {
  readonly [key: string]: string | EditionMessageTree
}

export interface EditionMessagesContract {
  load(locale: Locale): Promise<EditionMessageTree>
}
