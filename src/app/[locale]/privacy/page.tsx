import type { Locale } from '@/i18n/routing'
import { editionPages } from '@/lib/edition/current/pages'

export const dynamic = 'force-dynamic'

export default async function PrivacyPage({
  params,
}: {
  readonly params: Promise<{ readonly locale: Locale }>
}) {
  return await editionPages.privacy({ params })
}
