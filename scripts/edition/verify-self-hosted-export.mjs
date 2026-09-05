import { mkdtemp, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { exportSelfHostedTree } from './export-self-hosted.mjs'

// Proves that the exported open-source tree builds and runs with ee/ and the
// other private paths physically absent. `--out <dir> --keep` retains the
// verified tree so a publish step can ship exactly what was verified.

function parseArguments(argv) {
  let outputRoot = null
  let keep = false
  let ref = 'HEAD'
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--out') {
      outputRoot = argv[index + 1] ?? null
      index += 1
    } else if (argument === '--ref') {
      ref = argv[index + 1] ?? ref
      index += 1
    } else if (argument === '--keep') {
      keep = true
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }
  if (keep && !outputRoot) {
    throw new Error('--keep requires --out <directory>')
  }
  return { outputRoot: outputRoot ? path.resolve(outputRoot) : null, keep, ref }
}

const { outputRoot, keep, ref } = parseArguments(process.argv.slice(2))
const projectRoot = process.cwd()
const temporaryRoot = outputRoot
  ? null
  : await mkdtemp(path.join(os.tmpdir(), 'waoowaoo-self-hosted-export-'))
const exportRoot = outputRoot ?? path.join(temporaryRoot, 'source')

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: exportRoot,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${String(result.status)}`)
  }
}

const selfHostedEnvironment = {
  HUSKY: '0',
  NODE_ENV: 'test',
  DEPLOYMENT_EDITION: 'self-hosted',
  PROVIDER_CREDENTIAL_MODE: 'user-key',
  BILLING_MODE: 'OFF',
  STORAGE_TYPE: 'local',
  NEXTAUTH_URL: 'http://localhost:3000',
  NEXTAUTH_SECRET: 'self-hosted-export-verification-secret',
  API_ENCRYPTION_KEY: 'self-hosted-export-verification-key',
  PLATFORM_DEFAULT_ASSISTANT_MODEL: 'openrouter::openai/gpt-5.6-luna',
}

let verified = false
try {
  const { commit } = await exportSelfHostedTree({ projectRoot, outputRoot: exportRoot, ref })
  run('npm', ['ci'], selfHostedEnvironment)
  run('npm', ['run', 'check:edition-boundaries'], selfHostedEnvironment)
  run('npm', ['run', 'typecheck:available-editions'], selfHostedEnvironment)
  run('npm', ['run', 'build:verify'], selfHostedEnvironment)
  run('npm', ['run', 'runtime:self-hosted:smoke'], selfHostedEnvironment)
  verified = true
  process.stdout.write(`Self-hosted export of ${commit} verified with ee/ physically absent.\n`)
  if (keep) process.stdout.write(`Verified tree kept at ${exportRoot}\n`)
} finally {
  if (temporaryRoot) {
    await rm(temporaryRoot, { recursive: true, force: true })
  } else if (!keep || !verified) {
    await rm(exportRoot, { recursive: true, force: true })
  }
}
