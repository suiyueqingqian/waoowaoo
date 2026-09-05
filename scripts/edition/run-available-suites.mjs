import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const [coreScript, eeScript] = process.argv.slice(2)
if (!coreScript || !eeScript) {
  throw new Error('run-available-suites requires Core and EE npm script names')
}

function run(script) {
  const result = spawnSync('npm', ['run', script], { stdio: 'inherit', env: process.env })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run(coreScript)
if (existsSync('ee/package.json')) run(eeScript)
