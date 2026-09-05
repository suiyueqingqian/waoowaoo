import type { NextRequest } from 'next/server'
import type { EditionRouteContext } from '@/lib/edition/contracts/routes'
import { editionRouteHandlers } from '@/lib/edition/current/routes'

export function GET(request: NextRequest, context: EditionRouteContext): Promise<Response> {
  return editionRouteHandlers.authWechatCallbackGet(request, context)
}

export function POST(request: NextRequest, context: EditionRouteContext): Promise<Response> {
  return editionRouteHandlers.authWechatCallbackPost(request, context)
}
