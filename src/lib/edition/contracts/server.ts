import type {
  DeploymentConfig,
  ProviderCredentialMode,
} from '@/lib/deployment/config'
import type { DeploymentEdition } from '@/lib/deployment/edition'
import type { DeploymentFeatures } from '@/lib/deployment/features'

export interface EditionServerContract {
  readonly edition: DeploymentEdition
  readonly providerCredentials: {
    readonly defaultMode: ProviderCredentialMode
  }
  readonly projectConfiguration: {
    readonly userManagedModels: boolean
  }
  readonly auth: {
    readonly secureCookiesInProduction: boolean
  }
  readonly billing: {
    readonly mustEnforce: boolean
    readonly realtimeLlmSettlement: boolean
    /** Lowest revenue, in CNY, that one sold credit can produce in this edition. */
    readonly minimumEffectiveCreditPriceCny: number
  }
  readonly codexRuntime: {
    readonly requireDockerInProduction: boolean
  }
  getDeploymentFeatures(config: DeploymentConfig): DeploymentFeatures
}
