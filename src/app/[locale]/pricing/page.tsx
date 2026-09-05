import type { Locale } from '@/i18n/routing'
import { editionPages } from '@/lib/edition/current/pages'

export const dynamic = 'force-dynamic'

export default async function PricingPage({
  params,
}: {
  readonly params: Promise<{ readonly locale: Locale }>
}) {
  return await editionPages.pricing({ params })
}
