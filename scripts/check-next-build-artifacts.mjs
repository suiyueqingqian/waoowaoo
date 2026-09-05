import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const configuredDistDir = process.env.NEXT_DIST_DIR?.trim() || '.next'
const serverDirectory = path.join(configuredDistDir, 'server')
const manifestPath = path.join(serverDirectory, 'functions-config-manifest.json')

let manifest
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
} catch (error) {
  const detail = error instanceof Error ? error.message : 'unknown error'
  throw new Error(`NEXT_BUILD_FUNCTIONS_MANIFEST_INVALID:${detail}`)
}

const functions = manifest && typeof manifest === 'object' && !Array.isArray(manifest)
  ? manifest.functions
  : null
const proxy = functions && typeof functions === 'object' && !Array.isArray(functions)
  ? functions['/_middleware']
  : null
const matchers = proxy && typeof proxy === 'object' && !Array.isArray(proxy)
  && proxy.runtime === 'nodejs'
  ? proxy.matchers
  : null

if (!Array.isArray(matchers) || matchers.length === 0 || matchers.some((matcher) => (
  !matcher || typeof matcher !== 'object'
  || typeof matcher.regexp !== 'string' || matcher.regexp.length === 0
))) {
  throw new Error('NEXT_BUILD_LOCALE_PROXY_MISSING')
}

// Next's Node runtime loads this bundle for the /_middleware function entry.
const bundle = statSync(path.join(serverDirectory, 'middleware.js'))
if (!bundle.isFile() || bundle.size === 0) {
  throw new Error('NEXT_BUILD_LOCALE_PROXY_BUNDLE_INVALID')
}

process.stdout.write(`NEXT_BUILD_ARTIFACTS_OK:${configuredDistDir}\n`)
