import type { Locale } from '@/i18n/routing'
import { editionPages } from '@/lib/edition/current/pages'

export const dynamic = 'force-dynamic'

export default async function TermsPage({
  params,
}: {
  readonly params: Promise<{ readonly locale: Locale }>
}) {
  return await editionPages.terms({ params })
}
