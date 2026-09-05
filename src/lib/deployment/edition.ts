export type DeploymentEdition = 'self-hosted' | 'cloud'

const DEPLOYMENT_EDITIONS = ['self-hosted', 'cloud'] as const satisfies ReadonlyArray<DeploymentEdition>

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

export function parseDeploymentEdition(value: unknown): DeploymentEdition | null {
  const normalized = normalizeString(value)
  if (!normalized) return null
  if (!DEPLOYMENT_EDITIONS.includes(normalized as DeploymentEdition)) return null
  return normalized as DeploymentEdition
}

export function readDeploymentEdition(
  environment: NodeJS.ProcessEnv = process.env,
): DeploymentEdition {
  const rawEdition = environment.DEPLOYMENT_EDITION
  const edition = parseDeploymentEdition(rawEdition)
  if (edition) return edition
  if (rawEdition) {
    throw new Error(`DEPLOYMENT_EDITION_INVALID: ${rawEdition}`)
  }
  return 'self-hosted'
}
