import { NextRequest } from 'next/server'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { executeProjectAgentOperationFromApi } from '@/lib/adapters/api/execute-project-agent-operation'

/**
 * 代理下载单个视频文件
 * 用于解决存储跨域下载问题
 */
export const GET = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const { projectId } = await context.params
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')?.trim() || ''

  if (!key) {
    throw new ApiError('INVALID_PARAMS', {
      field: 'key',
      message: 'key is required',
    })
  }

  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult

  const resolved = await executeProjectAgentOperationFromApi({
    request,
    operationId: 'resolve_video_proxy',
    projectId,
    userId: authResult.session.user.id,
    input: {
      key,
      expiresSeconds: 3600,
    },
    source: 'project-ui',
  })

  if (!resolved || typeof resolved !== 'object' || Array.isArray(resolved)) {
    throw new ApiError('EXTERNAL_ERROR', {
      code: 'VIDEO_PROXY_RESOLUTION_INVALID',
      message: 'resolve_video_proxy returned invalid payload',
    })
  }

  const fetchUrl = typeof (resolved as { fetchUrl?: unknown }).fetchUrl === 'string'
    ? (resolved as { fetchUrl: string }).fetchUrl
    : ''
  if (!fetchUrl) {
    throw new ApiError('EXTERNAL_ERROR', {
      code: 'VIDEO_PROXY_RESOLUTION_INVALID',
      message: 'resolve_video_proxy missing fetchUrl',
    })
  }

  const response = await fetch(fetchUrl)
  if (!response.ok) {
    throw new ApiError('EXTERNAL_ERROR', {
      code: 'VIDEO_PROXY_FETCH_FAILED',
      message: `Failed to fetch video: ${response.status} ${response.statusText}`,
      status: response.status,
    })
  }

  const contentType = response.headers.get('content-type') || 'video/mp4'
  const contentLength = response.headers.get('content-length')

  const headers: HeadersInit = {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
  }
  if (contentLength) {
    headers['Content-Length'] = contentLength
  }

  return new Response(response.body, { headers })
})

