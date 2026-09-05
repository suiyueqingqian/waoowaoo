import { describe, expect, it } from 'vitest'
import { toOperationPlanView } from '@/lib/operations/planning'
import type { OperationPlan } from '@/lib/operations/plan-contract'
import { TASK_TYPE } from '@/lib/task/types'

function buildSelfHostedPlan(): OperationPlan {
  return {
    kind: 'task_submission',
    operationId: 'create_video',
    projectId: 'project-1',
    userId: 'user-1',
    tasks: [{
      id: 'video-task',
      taskType: TASK_TYPE.WORKSPACE_RESOURCE_VIDEO,
      target: { targetType: 'WorkspaceResource', targetId: 'video-resource-1' },
      payload: { model: 'planned-video-model' },
      billingInfo: {
        billable: true,
        source: 'task',
        taskType: TASK_TYPE.WORKSPACE_RESOURCE_VIDEO,
        apiType: 'video',
        model: 'planned-video-model',
        quantity: 1,
        unit: 'second',
        maxFrozenCost: 6,
        action: TASK_TYPE.WORKSPACE_RESOURCE_VIDEO,
        status: 'quoted',
      },
      locale: 'zh',
    }],
  }
}

describe('self-hosted operation planning view', () => {
  it('keeps task facts while omitting Cloud credit amounts', async () => {
    const view = await toOperationPlanView(buildSelfHostedPlan())

    expect(view.quote.showCredits).toBe(false)
    expect(view.quote.mediaTaskCount).toBe(1)
    expect(Object.prototype.hasOwnProperty.call(view.quote, 'totalMaxFrozenCost')).toBe(false)
    expect(view.quote.items.every((item) => (
      !Object.prototype.hasOwnProperty.call(item, 'maxFrozenCost')
    ))).toBe(true)
  })
})
