import type { EditionServerContract } from '@/lib/edition/contracts/server'
import type { DeploymentFeatures } from '@/lib/deployment/features'
import { CREDITS_PER_CNY } from '@/lib/billing/credits'

const SELF_HOSTED_DEPLOYMENT_FEATURES = {
  showOfficialPublicPages: false,
  showPricingPage: false,
  showLegalPages: false,
  showRecharge: false,
  showSubscription: false,
  showBilling: false,
  showPublicBetaWaitlist: false,
  showWorkflowConcurrency: false,
  showAccountSecurity: false,
  showGoogleOAuth: false,
  showWechatOfficialAuth: false,
  enablePhoneAuth: false,
  enablePasswordAuth: true,
  passwordAuthIdentity: 'username',
  showDownloadLogs: false,
  showUpdateCheck: true,
  showBetaBadge: false,
} as const satisfies Omit<DeploymentFeatures, 'showApiConfig'>

export const editionServer = {
  edition: 'self-hosted',
  providerCredentials: {
    defaultMode: 'user-key',
  },
  projectConfiguration: {
    userManagedModels: true,
  },
  auth: {
    secureCookiesInProduction: false,
  },
  billing: {
    mustEnforce: false,
    realtimeLlmSettlement: false,
    minimumEffectiveCreditPriceCny: 1 / CREDITS_PER_CNY,
  },
  codexRuntime: {
    requireDockerInProduction: false,
  },
  getDeploymentFeatures(config) {
    return {
      ...SELF_HOSTED_DEPLOYMENT_FEATURES,
      showApiConfig: config.providerCredentialMode === 'user-key',
    }
  },
} satisfies EditionServerContract
