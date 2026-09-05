import { notFound } from 'next/navigation'
import type { EditionPagesContract } from '@/lib/edition/contracts/pages'

async function unavailable(): Promise<never> {
  notFound()
}

export const editionPages = {
  pricing: unavailable,
  contact: unavailable,
  privacy: unavailable,
  terms: unavailable,
  refundPolicy: unavailable,
} satisfies EditionPagesContract
