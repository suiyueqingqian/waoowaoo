import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { readDeploymentEdition } from '../../src/lib/deployment/edition'
import { createEditionCompilerConfigs } from './compiler-config'

async function main(): Promise<void> {
  const projectRoot = process.cwd()
  const edition = readDeploymentEdition()
  const temporaryRoot = path.join(projectRoot, 'tmp')
  await mkdir(temporaryRoot, { recursive: true })
  const outputDirectory = await mkdtemp(path.join(temporaryRoot, 'edition-typecheck-'))
  try {
    const configs = createEditionCompilerConfigs(projectRoot, outputDirectory, edition)
    const configPaths = [
      path.join(outputDirectory, 'tsconfig.json'),
      path.join(outputDirectory, 'tsconfig.runtime-scripts.json'),
    ]
    await Promise.all([
      writeFile(configPaths[0], `${JSON.stringify(configs.application, null, 2)}\n`, 'utf8'),
      writeFile(configPaths[1], `${JSON.stringify(configs.runtimeScripts, null, 2)}\n`, 'utf8'),
    ])
    process.stdout.write(`Typechecking ${edition} with isolated compiler output.\n`)
    for (const configPath of configPaths) {
      const result = spawnSync(process.execPath, [
        path.join(projectRoot, 'node_modules/typescript/bin/tsc'),
        '--noEmit', '-p', configPath,
      ], { stdio: 'inherit', cwd: projectRoot })
      if (result.error) throw result.error
      if (result.status !== 0) {
        process.exitCode = result.status ?? 1
        return
      }
    }
  } finally {
    await rm(outputDirectory, { recursive: true, force: true })
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`)
  process.exitCode = 1
})
