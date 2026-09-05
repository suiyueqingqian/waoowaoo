import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const projectRoot = process.cwd()
const eeManifest = path.join(projectRoot, 'ee', 'package.json')
const eeNodeModules = path.join(projectRoot, 'ee', 'node_modules') + path.sep
const eeRequire = createRequire(pathToFileURL(eeManifest))
const requiredPackages = [
  '@alicloud/dysmsapi20170525',
  '@alicloud/openapi-client',
  '@stripe/stripe-js',
  'libphonenumber-js',
  'stripe',
]

const missing = requiredPackages.filter((packageName) => {
  try {
    return !eeRequire.resolve(packageName).startsWith(eeNodeModules)
  } catch {
    return true
  }
})

if (missing.length > 0) {
  process.stderr.write(
    `Cloud EE dependencies are missing: ${missing.join(', ')}. Run npm run edition:deps:install:cloud.\n`,
  )
  process.exitCode = 1
} else {
  process.stdout.write('Cloud EE dependencies are installed.\n')
}
