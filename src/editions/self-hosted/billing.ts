import type { EditionBillingContract } from '@/lib/edition/contracts/billing'

export const editionBilling = {
  async applySignupGrant() {},
  async assertLlmSpendableBalance() {},
  async settleRealtimeLlmUsage(input) {
    return {
      status: 'ignored',
      exactRetailCredits: input.exactRetailCredits,
      chargedCredits: 0,
      uncoveredMicrocredits: BigInt(0),
    }
  },
} satisfies EditionBillingContract
