import { readdir, readFile } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const sourceRoot = path.join(projectRoot, 'src')
const enterpriseRoot = path.join(projectRoot, 'ee')
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
// Provider implementations live one directory below the providers root. They
// are leaves of the AI registry: the registry composes them at module init, so
// any value import from a provider back into a registry consumer makes the
// registry content depend on which module happened to be evaluated first.
const PROVIDER_IMPLEMENTATION_PATTERN = /^(?:src\/lib|ee\/src)\/ai-providers\/[^/]+\//u
const PROVIDER_REGISTRY_CONSUMERS = [
  '@/lib/user-api/runtime-config',
  '@/lib/ai-registry/api-config-catalog',
  '@/lib/ai-registry/platform-models',
  '@/lib/platform-models/catalog',
  '@/lib/ai-providers/manifests',
  '@/lib/ai-providers/index',
]

function stripTypeOnlyImports(source: string): string {
  return source.replace(/^import\s+type\s[^;]*?from\s+['"][^'"]+['"];?$/gmu, '')
}

async function collectSourceFiles(root: string): Promise<string[]> {
  let entries: Dirent[]
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch (error: unknown) {
    if (
      error
      && typeof error === 'object'
      && 'code' in error
      && error.code === 'ENOENT'
    ) return []
    throw error
  }
  const nested = await Promise.all(entries.map(async (entry): Promise<string[]> => {
    const absolutePath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') return []
      return await collectSourceFiles(absolutePath)
    }
    if (!entry.isFile() || !sourceExtensions.has(path.extname(entry.name))) return []
    return [absolutePath]
  }))
  return nested.flat()
}

function relativePath(filePath: string): string {
  return path.relative(projectRoot, filePath).split(path.sep).join('/')
}

function containsImport(source: string, fragment: string): boolean {
  const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:from\\s+|import\\s*\\(|require\\s*\\()\\s*['\"][^'\"]*${escaped}`).test(source)
}

async function main(): Promise<void> {
  const violations: string[] = []
  const sourceFiles = await collectSourceFiles(sourceRoot)
  const enterpriseFiles = await collectSourceFiles(enterpriseRoot)

  for (const filePath of sourceFiles) {
    const file = relativePath(filePath)
    const source = await readFile(filePath, 'utf8')

    if (containsImport(source, 'ee/') || containsImport(source, '@ee/')) {
      violations.push(`${file}: Core source must not import EE source directly`)
    }

    if (
      source.includes('@edition-implementation/')
      && !file.startsWith('src/lib/edition/current/')
    ) {
      violations.push(`${file}: only the edition composition root may import @edition-implementation`)
    }

    if (source.includes('process.env.DEPLOYMENT_EDITION') && file !== 'src/lib/deployment/edition.ts') {
      violations.push(`${file}: DEPLOYMENT_EDITION may only be read by the deployment edition parser`)
    }

    if (source.includes('isCloudDeployment') && file !== 'src/lib/deployment/config.ts') {
      violations.push(`${file}: Core code must consume declared edition capabilities, not a cloud predicate`)
    }

    if (
      /\.edition\s*[!=]==?\s*['"]cloud['"]/u.test(source)
      && file !== 'src/lib/deployment/config.ts'
    ) {
      violations.push(`${file}: Core code must not branch directly on the cloud edition`)
    }
  }

  for (const filePath of [...sourceFiles, ...enterpriseFiles]) {
    const file = relativePath(filePath)
    if (!PROVIDER_IMPLEMENTATION_PATTERN.test(file)) continue
    const source = stripTypeOnlyImports(await readFile(filePath, 'utf8'))
    for (const consumer of PROVIDER_REGISTRY_CONSUMERS) {
      if (containsImport(source, consumer)) {
        violations.push(`${file}: provider implementations must not import the registry consumer ${consumer}; the engine injects resolved config through the execution context`)
      }
    }
  }

  for (const filePath of enterpriseFiles) {
    const file = relativePath(filePath)
    const source = await readFile(filePath, 'utf8')
    if (containsImport(source, 'src/editions/self-hosted') || containsImport(source, '@/editions/self-hosted')) {
      violations.push(`${file}: EE source must implement the contract, not import self-hosted implementation`)
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Edition boundary violations:\n${violations.map((entry) => `- ${entry}`).join('\n')}`,
    )
  }

  process.stdout.write(
    `Edition boundaries valid (${sourceFiles.length} Core files, ${enterpriseFiles.length} EE files).\n`,
  )
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
