#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

function readOption(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const suite = readOption('--suite')
const roots = process.argv.flatMap((value, index, values) => value === '--root' ? [values[index + 1]] : [])
if (!suite || roots.length === 0 || roots.some((root) => !root)) {
  throw new Error('run-required-suite requires --suite and at least one --root')
}

fs.mkdirSync('reports/test-results', { recursive: true })
const report = `reports/test-results/${suite}.json`

function listTests(root) {
  const output = []
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        visit(filePath)
      } else if (entry.isFile() && /\.test\.tsx?$/.test(entry.name)) {
        output.push(filePath.split(path.sep).join('/'))
      }
    }
  }
  visit(root)
  return output
}

const testFiles = roots.flatMap(listTests).sort()
if (testFiles.length === 0) throw new Error(`Suite ${suite} discovered zero test files`)
const vitest = spawnSync('npx', [
  'vitest', 'run', ...testFiles,
  '--reporter=default', '--reporter=json', `--outputFile=${report}`,
], { stdio: 'inherit', env: process.env })

const verify = spawnSync('node', [
  'scripts/test-verification/verify-vitest-report.mjs',
  '--suite', suite,
  '--report', report,
  ...roots.flatMap((root) => ['--root', root]),
], { stdio: 'inherit', env: process.env })

if (vitest.error) throw vitest.error
if (verify.error) throw verify.error
if (vitest.status !== 0 || verify.status !== 0) process.exit(1)
