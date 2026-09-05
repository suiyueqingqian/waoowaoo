import type { ComponentType } from 'react'
import type { PublicDeploymentFeatures } from '@/lib/deployment/public-client'
import type { ProfileTranslationParams } from '@/lib/profile/billing-transaction-display'
import type { WorkflowConcurrencyConfig } from '@/lib/workflow-concurrency'

export interface ApiConfigConcurrencyProps {
  readonly value: WorkflowConcurrencyConfig
  readonly onChange: (field: keyof WorkflowConcurrencyConfig, rawValue: string) => void
}

export interface AuthEntryCardProps {
  readonly features: Pick<
    PublicDeploymentFeatures,
    | 'enablePhoneAuth'
    | 'enablePasswordAuth'
    | 'passwordAuthIdentity'
    | 'showGoogleOAuth'
    | 'showWechatOfficialAuth'
  >
}

export interface PaidBetaCheckoutSuccessDialogProps {
  readonly providerObjectId: string | null
  readonly onClose: () => void
}

export interface AccountSecurityTabProps {
  readonly enablePasswordAuth: boolean
  readonly showGoogleOAuth: boolean
  readonly showWechatOfficialAuth: boolean
}

export interface ProfileTransactionItem {
  readonly id: string
  readonly type: string
  readonly amount: number
  readonly balanceAfter: number
  readonly description?: string | null
  readonly action?: string | null
  readonly projectName?: string | null
  readonly billingMeta?: Record<string, unknown> | null
  readonly target?: {
    readonly targetType: string
    readonly targetId: string
    readonly labelKey: string
    readonly labelParams: ProfileTranslationParams
  } | null
  readonly transactionCount?: number
  readonly createdAt: string
}

export interface ProfileProjectCostSummary {
  readonly projectId: string
  readonly projectName: string | null
  readonly totalCost: number
  readonly recordCount: number
}

export interface ProfileProjectCostDetail {
  readonly id: string
  readonly action: string
  readonly apiType: string
  readonly quantity: number
  readonly unit: string
  readonly cost: number
  readonly createdAt: string
}

export interface ProfileBalanceSummary {
  readonly currency?: string
  readonly balance?: number
  readonly rechargeCredits?: number
  readonly subscriptionCredits?: number
  readonly subscriptionExpiresAt?: string | null
  readonly frozenAmount?: number
  readonly totalSpent?: number
  readonly subscription?: {
    readonly planId: string
    readonly monthlyCredits: number
    readonly interval: string
    readonly status: string
    readonly currentPeriodEnd: string
  } | null
}

export interface ProfileOverviewSectionProps {
  readonly balance: ProfileBalanceSummary | null
  readonly transactions: readonly ProfileTransactionItem[]
  readonly timeZone: string
  readonly showUpgrade: boolean
  readonly paymentNotice: string | null
  readonly onViewAllTransactions: () => void
}

export interface ProfileBillingSectionProps {
  readonly transactions: readonly ProfileTransactionItem[]
  readonly projectCosts: readonly ProfileProjectCostSummary[]
  readonly totalProjectCost: number
  readonly timeZone: string
  readonly currency?: string
  readonly onRefresh: () => void
  readonly onLoadProjectDetails: (
    projectId: string,
  ) => Promise<readonly ProfileProjectCostDetail[]>
}

export interface EditionClientContract {
  readonly ApiConfigConcurrency: ComponentType<ApiConfigConcurrencyProps> | null
  readonly WorkspaceAnnouncementHost: ComponentType
  readonly AuthEntryCard: ComponentType<AuthEntryCardProps>
  readonly PaidBetaCheckoutSuccessDialog: ComponentType<PaidBetaCheckoutSuccessDialogProps>
  readonly AccountSecurityTab: ComponentType<AccountSecurityTabProps>
  readonly ProfileOverviewSection: ComponentType<ProfileOverviewSectionProps>
  readonly ProfileBillingSection: ComponentType<ProfileBillingSectionProps>
}
