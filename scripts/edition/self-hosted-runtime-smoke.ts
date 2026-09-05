import { NextRequest } from 'next/server'
import { getDeploymentConfig } from '@/lib/deployment/config'
import { editionAuth } from '@/lib/edition/current/auth'
import { compiledDeploymentEdition } from '@/lib/edition/current/manifest'
import { editionMessages } from '@/lib/edition/current/messages'
import { editionRouteHandlers } from '@/lib/edition/current/routes'
import { editionServer } from '@/lib/edition/current/server'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function main(): Promise<void> {
  const config = getDeploymentConfig()
  assert(compiledDeploymentEdition === 'self-hosted', 'compiled edition must be self-hosted')
  assert(config.edition === 'self-hosted', 'runtime edition must be self-hosted')
  assert(config.providerCredentialMode === 'user-key', 'self-hosted must default to user keys')
  assert(config.mediaObjectDelivery === 'authenticated-proxy', 'self-hosted media must use the authenticated proxy')
  assert(config.providerMediaInputTransport === 'inline-data-url', 'self-hosted provider media must use inline transport')
  assert(editionServer.edition === 'self-hosted', 'server contract must be self-hosted')
  assert(!editionServer.billing.mustEnforce, 'self-hosted billing enforcement must be disabled')
  const providers = editionAuth.createProviders()
  assert(providers.length === 1, 'self-hosted must expose one credentials provider')
  assert(providers[0]?.id === 'credentials', 'self-hosted credentials provider is missing')

  const messages = await editionMessages.load('en')
  assert(Object.keys(messages).length === 0, 'self-hosted must not load EE message namespaces')

  const response = await editionRouteHandlers.paymentsStripeWebhookPost(
    new NextRequest('http://localhost/api/payments/stripe/webhook', { method: 'POST' }),
    { params: Promise.resolve({}) },
  )
  assert(response.status === 404, 'EE route must fail closed before side effects')

  process.stdout.write('Self-hosted runtime edition smoke passed.\n')
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
  process.exitCode = 1
})
