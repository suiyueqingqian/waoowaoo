import type { ProjectAgentOperationDefinition, ProjectAgentOperationDefinitionBase } from './types'

export function defineOperation<Input, Output>(
  operation: ProjectAgentOperationDefinitionBase<Input, Output>,
): ProjectAgentOperationDefinitionBase<Input, Output> {
  return operation
}

export function definePackedOperation<Input, Output>(
  operation: ProjectAgentOperationDefinition<Input, Output>,
): ProjectAgentOperationDefinition<Input, Output> {
  return operation
}
