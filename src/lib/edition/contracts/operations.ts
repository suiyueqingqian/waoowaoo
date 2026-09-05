import type { ProjectAgentOperationRegistry } from '@/lib/operations/types'

export interface EditionOperationsContract {
  createProjectAgentOperationRegistry(): ProjectAgentOperationRegistry
}
