import bcrypt from 'bcryptjs'
import { createAuthUser } from '@/lib/auth/account-onboarding'
import { readPasswordAuthMode } from '@/lib/auth/password-auth-contract'
import { AUTH_PASSWORD_MIN_LENGTH } from '@/lib/auth/password-policy'
import { logAuthAction } from '@/lib/logging/semantic'
import { prisma } from '@/lib/prisma'
import { getPrismaErrorCode } from '@/lib/prisma-error'

export interface PasswordAuthUser {
  id: string
  name: string
}

function normalizeUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePassword(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

async function readUsernamePasswordUser(name: string) {
  return await prisma.user.findUnique({
    where: { name },
    select: {
      id: true,
      name: true,
      password: true,
    },
  })
}

function toPasswordAuthUser(user: PasswordAuthUser): PasswordAuthUser {
  return {
    id: user.id,
    name: user.name,
  }
}

async function verifyPasswordUser(input: {
  user: Awaited<ReturnType<typeof readUsernamePasswordUser>>
  password: string
  identityForLog: string
}): Promise<PasswordAuthUser | null> {
  if (!input.user?.password || !await bcrypt.compare(input.password, input.user.password)) {
    logAuthAction(
      'LOGIN',
      'Invalid password credentials',
      { success: false, provider: 'password' },
      input.user?.id,
      input.identityForLog,
    )
    return null
  }

  logAuthAction(
    'LOGIN',
    'Password login succeeded',
    { success: true, provider: 'password' },
    input.user.id,
    input.identityForLog,
  )
  return toPasswordAuthUser(input.user)
}

export async function authorizePasswordIdentity(input: {
  identity: unknown
  password: unknown
  mode: unknown
}): Promise<PasswordAuthUser | null> {
  const mode = readPasswordAuthMode(input.mode)
  if (!mode) {
    logAuthAction('LOGIN', 'Password auth mode invalid', { success: false, provider: 'password' })
    return null
  }

  const name = normalizeUsername(input.identity)
  if (!name) {
    logAuthAction(mode === 'register' ? 'REGISTER' : 'LOGIN', 'Missing username', {
      success: false,
      provider: 'password',
    })
    return null
  }

  const password = normalizePassword(input.password)
  if (mode === 'login') {
    return await verifyPasswordUser({
      user: await readUsernamePasswordUser(name),
      password,
      identityForLog: name,
    })
  }

  if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
    logAuthAction('REGISTER', 'Password too short', { success: false, provider: 'password' }, undefined, name)
    return null
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  try {
    const user = await prisma.$transaction(async (tx) => (
      await createAuthUser(tx, {
        name,
        password: hashedPassword,
      })
    ))
    logAuthAction('REGISTER', 'Password registration succeeded', { success: true, provider: 'password' }, user.id, name)
    return toPasswordAuthUser(user)
  } catch (error) {
    if (getPrismaErrorCode(error) !== 'P2002') throw error
    logAuthAction('REGISTER', 'Username already registered', {
      success: false,
      provider: 'password',
    }, undefined, name)
    return null
  }
}
