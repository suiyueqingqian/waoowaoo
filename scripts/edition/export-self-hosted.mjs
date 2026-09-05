import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The self-hosted export is the only entry that produces the public
 * open-source tree. It is defined as: the committed tree at a Git ref, minus
 * this exclusion list. Nothing else decides what is public; .gitignore only
 * manages local and generated files.
 */
export const SELF_HOSTED_EXPORT_EXCLUSIONS = Object.freeze([
  // Cloud edition implementation, private dependencies and production tooling.
  'ee',
  // Internal engineering governance.
  'AGENTS.md',
  'CLAUDE.md',
  '.github/agents',
  // Workflow that only makes sense in the private superset repository.
  '.github/workflows/publish-oss.yml',
])

function runGit(args, cwd) {
  const result = spawnSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'inherit'] })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} exited with ${String(result.status)}`)
  }
  return result.stdout
}

function runTar(args, cwd) {
  const result = spawnSync('tar', args, { cwd, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`tar ${args.join(' ')} exited with ${String(result.status)}`)
  }
}

export async function exportSelfHostedTree({ projectRoot, outputRoot, ref = 'HEAD' }) {
  if (existsSync(outputRoot)) {
    throw new Error(`Export target already exists: ${outputRoot}`)
  }
  const commit = runGit(['rev-parse', '--verify', `${ref}^{commit}`], projectRoot).toString('utf8').trim()
  const archiveRoot = await mkdtemp(path.join(os.tmpdir(), 'waoowaoo-export-archive-'))
  const archivePath = path.join(archiveRoot, 'source.tar')
  try {
    runGit(['archive', '--format=tar', '-o', archivePath, commit], projectRoot)
    await mkdir(outputRoot, { recursive: true })
    runTar(['-xf', archivePath, '-C', outputRoot], projectRoot)
  } finally {
    await rm(archiveRoot, { recursive: true, force: true })
  }

  for (const relativePath of SELF_HOSTED_EXPORT_EXCLUSIONS) {
    await rm(path.join(outputRoot, relativePath), { recursive: true, force: true })
  }
  if (existsSync(path.join(outputRoot, 'ee'))) {
    throw new Error('Self-hosted export unexpectedly contains ee/')
  }
  return { commit, outputRoot }
}

function parseArguments(argv) {
  let outputRoot = null
  let ref = 'HEAD'
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--out') {
      outputRoot = argv[index + 1] ?? null
      index += 1
    } else if (argument === '--ref') {
      ref = argv[index + 1] ?? ref
      index += 1
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }
  if (!outputRoot) {
    throw new Error('Usage: node scripts/edition/export-self-hosted.mjs --out <directory> [--ref <git-ref>]')
  }
  return { outputRoot: path.resolve(outputRoot), ref }
}

const isDirectInvocation = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectInvocation) {
  try {
    const { outputRoot, ref } = parseArguments(process.argv.slice(2))
    const result = await exportSelfHostedTree({ projectRoot: process.cwd(), outputRoot, ref })
    process.stdout.write(`Exported self-hosted tree from ${result.commit} to ${result.outputRoot}\n`)
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  }
}
