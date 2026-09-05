import type { Prisma } from '@prisma/client'
import type { LlmUsageFact } from '@/lib/billing/llm-usage'

export interface RealtimeLlmSettlementInput {
  readonly usageId: string
  readonly projectId: string
  readonly userId: string
  readonly action: string
  readonly usage: LlmUsageFact
  readonly exactRetailCredits: number
  readonly pricingSource: 'openrouter_reported_cost' | 'catalog_usage'
  readonly metadata?: Record<string, unknown>
}

export interface RealtimeLlmSettlementResult {
  readonly status: 'settled' | 'already_settled' | 'ignored'
  readonly exactRetailCredits: number
  readonly chargedCredits: number
  readonly uncoveredMicrocredits: bigint
}

export interface EditionBillingContract {
  applySignupGrant(tx: Prisma.TransactionClient, userId: string): Promise<void>
  assertLlmSpendableBalance(userId: string): Promise<void>
  settleRealtimeLlmUsage(
    input: RealtimeLlmSettlementInput,
  ): Promise<RealtimeLlmSettlementResult>
}
