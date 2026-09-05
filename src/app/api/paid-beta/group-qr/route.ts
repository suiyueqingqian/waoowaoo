import type { NextRequest } from 'next/server'
import type { EditionRouteContext } from '@/lib/edition/contracts/routes'
import { editionRouteHandlers } from '@/lib/edition/current/routes'

export const runtime = 'nodejs'

export function GET(request: NextRequest, context: EditionRouteContext): Promise<Response> {
  return editionRouteHandlers.paidBetaGroupQrGet(request, context)
}
