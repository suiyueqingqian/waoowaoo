import type { NextAuthOptions } from 'next-auth'

type AuthCallbacks = NonNullable<NextAuthOptions['callbacks']>
type SignInCallback = NonNullable<AuthCallbacks['signIn']>
type JwtCallback = NonNullable<AuthCallbacks['jwt']>

export type EditionAuthSignInInput = Parameters<SignInCallback>[0]
export type EditionAuthJwtInput = Parameters<JwtCallback>[0]

export interface EditionAuthContract {
  createProviders(): NextAuthOptions['providers']
  readonly rateLimitedCredentialProviderIds: readonly string[]
  signIn(input: EditionAuthSignInInput): ReturnType<SignInCallback>
  enrichJwt(input: EditionAuthJwtInput): Promise<void>
}
