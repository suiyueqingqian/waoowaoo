import type { NextAuthOptions } from "next-auth"
import { createAuthAdapter } from '@/lib/auth/next-auth-adapter'
import { editionAuth } from '@/lib/edition/current/auth'
import { editionServer } from '@/lib/edition/current/server'
import { prisma } from '@/lib/prisma'

const secureCookieRequired = (editionServer.auth.secureCookiesInProduction && process.env.NODE_ENV === 'production')
  || (process.env.NEXTAUTH_URL || '').startsWith('https://')

export function createAuthOptions(): NextAuthOptions {
  return {
    adapter: createAuthAdapter(),
    useSecureCookies: secureCookieRequired,
    providers: editionAuth.createProviders(),
    session: {
      strategy: "jwt"
    },
    pages: {
      signIn: "/auth/signin",
    },
    callbacks: {
      signIn: editionAuth.signIn,
      async jwt(input) {
        const { token, user, trigger } = input
        if (user) {
          token.id = user.id
        }
        await editionAuth.enrichJwt(input)
        if (trigger === 'update' && typeof token.id === 'string') {
          const currentUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { name: true },
          })
          if (currentUser) {
            token.name = currentUser.name
          }
        }
        return token
      },
      async session({ session, token }) {
        if (session.user && typeof token.id === 'string') {
          session.user.id = token.id
          session.user.image = typeof token.picture === 'string' ? token.picture : null
        }
        return session
      }
    }
  }
}
