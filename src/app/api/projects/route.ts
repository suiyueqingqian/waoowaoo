import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { executeProjectAgentOperationFromApi } from '@/lib/adapters/api/execute-project-agent-operation'

// GET - 获取用户的项目（支持分页和搜索）
export const GET = apiHandler(async (request: NextRequest) => {
  // 🔐 统一权限验证
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  // 获取查询参数
  const { searchParams } = new URL(request.url)
  const pageRaw = searchParams.get('page')?.trim() || ''
  const pageSizeRaw = searchParams.get('pageSize')?.trim() || ''
  const search = searchParams.get('search') || ''

  const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1
  const pageSize = pageSizeRaw ? Number.parseInt(pageSizeRaw, 10) : 12

  const resolvedPage = Number.isFinite(page) ? Math.max(1, Math.min(page, 10000)) : 1
  const resolvedPageSize = Number.isFinite(pageSize) ? Math.max(1, Math.min(pageSize, 200)) : 12

  const result = await executeProjectAgentOperationFromApi({
    request,
    operationId: 'list_projects',
    projectId: 'system',
    userId: session.user.id,
    input: {
      page: resolvedPage,
      pageSize: resolvedPageSize,
      search,
    },
    source: 'project-ui',
  })

  return NextResponse.json(result)
})

// POST - 创建新项目
export const POST = apiHandler(async (request: NextRequest) => {
  // 🔐 统一权限验证
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError('INVALID_PARAMS', {
      code: 'BODY_PARSE_FAILED',
      field: 'body',
      message: 'request body must be valid JSON',
    })
  }

  const result = await executeProjectAgentOperationFromApi({
    request,
    operationId: 'create_project',
    projectId: 'system',
    userId: session.user.id,
    input: body,
    source: 'project-ui',
  })

  return NextResponse.json(result, { status: 201 })
})
