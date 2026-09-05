import type { NextRequest } from 'next/server'
import type { EditionRouteContext } from '@/lib/edition/contracts/routes'
import { editionRouteHandlers } from '@/lib/edition/current/routes'

type AnnouncementRouteParams = { announcementId: string }

export function POST(
  request: NextRequest,
  context: EditionRouteContext<AnnouncementRouteParams>,
): Promise<Response> {
  return editionRouteHandlers.announcementAcknowledgePost(request, context)
}
