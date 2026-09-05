import CredentialsProvider from 'next-auth/providers/credentials'
import { authorizePasswordIdentity } from '@/lib/auth/password-auth'
import type { EditionAuthContract } from '@/lib/edition/contracts/auth'

export const editionAuth = {
  createProviders() {
    return [CredentialsProvider({
      id: 'credentials',
      name: 'password',
      credentials: {
        identity: { label: 'Identity', type: 'text' },
        password: { label: 'Password', type: 'password' },
        mode: { label: 'Mode', type: 'text' },
      },
      async authorize(credentials) {
        return await authorizePasswordIdentity({
          identity: credentials?.identity,
          password: credentials?.password,
          mode: credentials?.mode,
        })
      },
    })]
  },
  rateLimitedCredentialProviderIds: ['credentials'],
  async signIn() {
    return true
  },
  async enrichJwt() {},
} satisfies EditionAuthContract
