import { NextRequest, NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { executeProjectAgentOperationFromApi } from '@/lib/adapters/api/execute-project-agent-operation'

export const POST = apiHandler(async (request: NextRequest) => {
    const authResult = await requireUserAuth()
    if (isErrorResponse(authResult)) return authResult

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
        operationId: 'api_user_api_config_test_connection',
        projectId: 'system',
        userId: authResult.session.user.id,
        input: body,
        source: 'api-config',
    })
    return NextResponse.json(result)
})
