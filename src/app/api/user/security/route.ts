import type { NextRequest } from 'next/server'
import type { EditionRouteContext } from '@/lib/edition/contracts/routes'
import { editionRouteHandlers } from '@/lib/edition/current/routes'

export function GET(request: NextRequest, context: EditionRouteContext): Promise<Response> {
  return editionRouteHandlers.userSecurityGet(request, context)
}

export function POST(request: NextRequest, context: EditionRouteContext): Promise<Response> {
  return editionRouteHandlers.userSecurityPost(request, context)
}

export function PATCH(request: NextRequest, context: EditionRouteContext): Promise<Response> {
  return editionRouteHandlers.userSecurityPatch(request, context)
}
