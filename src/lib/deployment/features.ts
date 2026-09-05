import type { DeploymentConfig } from './config'
import { editionServer } from '@/lib/edition/current/server'

export type PasswordAuthIdentity = 'username' | 'phone'

export interface DeploymentFeatures {
  showOfficialPublicPages: boolean
  showPricingPage: boolean
  showLegalPages: boolean
  showRecharge: boolean
  showSubscription: boolean
  showBilling: boolean
  showPublicBetaWaitlist: boolean
  showApiConfig: boolean
  showWorkflowConcurrency: boolean
  showAccountSecurity: boolean
  showGoogleOAuth: boolean
  showWechatOfficialAuth: boolean
  enablePhoneAuth: boolean
  enablePasswordAuth: boolean
  passwordAuthIdentity: PasswordAuthIdentity
  showDownloadLogs: boolean
  showUpdateCheck: boolean
  showBetaBadge: boolean
}

export function getDeploymentFeatures(config: DeploymentConfig): DeploymentFeatures {
  if (config.edition !== editionServer.edition) {
    throw new Error(
      `DEPLOYMENT_FEATURE_EDITION_MISMATCH: compiled=${editionServer.edition} runtime=${config.edition}`,
    )
  }
  return editionServer.getDeploymentFeatures(config)
}

export function toPublicDeploymentFeatures(features: DeploymentFeatures): DeploymentFeatures {
  return { ...features }
}
