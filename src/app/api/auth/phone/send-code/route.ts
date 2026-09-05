import type { NextRequest } from 'next/server'
import type { EditionRouteContext } from '@/lib/edition/contracts/routes'
import { editionRouteHandlers } from '@/lib/edition/current/routes'

export function POST(request: NextRequest, context: EditionRouteContext): Promise<Response> {
  return editionRouteHandlers.authPhoneSendCodePost(request, context)
}
