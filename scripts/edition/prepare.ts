import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { readDeploymentEdition } from '../../src/lib/deployment/edition'
import { createEditionCompilerConfigs } from './compiler-config'

async function main(): Promise<void> {
  const projectRoot = process.cwd()
  const outputDirectory = path.join(projectRoot, '.generated', 'edition')
  const edition = readDeploymentEdition()
  const implementationPath = edition === 'cloud'
    ? 'ee/src/edition/*'
    : 'src/editions/self-hosted/*'

  const compilerConfigs = createEditionCompilerConfigs(projectRoot, outputDirectory, edition)

  const manifest = {
    schemaVersion: 1,
    edition,
    implementationPath,
    source: 'DEPLOYMENT_EDITION',
    nextConfig: edition === 'cloud'
      ? {
          scriptOrigins: ['https://js.stripe.com'],
          frameOrigins: ['https://js.stripe.com', 'https://hooks.stripe.com'],
          imageRemotePatterns: [
            { protocol: 'https', hostname: '**.googleusercontent.com' },
            { protocol: 'https', hostname: '**.ggpht.com' },
          ],
        }
      : {
          scriptOrigins: [],
          frameOrigins: [],
          imageRemotePatterns: [],
        },
  }

  await mkdir(outputDirectory, { recursive: true })
  await Promise.all([
    writeFile(
      path.join(outputDirectory, 'tsconfig.json'),
      `${JSON.stringify(compilerConfigs.application, null, 2)}\n`,
      'utf8',
    ),
    writeFile(
      path.join(outputDirectory, 'tsconfig.runtime-scripts.json'),
      `${JSON.stringify(compilerConfigs.runtimeScripts, null, 2)}\n`,
      'utf8',
    ),
    writeFile(
      path.join(outputDirectory, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    ),
  ])

  process.stdout.write(`Prepared ${edition} edition binding.\n`)
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
