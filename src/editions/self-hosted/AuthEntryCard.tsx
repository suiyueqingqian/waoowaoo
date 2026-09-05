'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import PasswordInput from '@/components/auth/PasswordInput'
import { useRouter } from '@/i18n/navigation'
import type { PasswordAuthMode } from '@/lib/auth/password-auth-contract'
import { AUTH_PASSWORD_MIN_LENGTH } from '@/lib/auth/password-policy'
import type { AuthEntryCardProps } from '@/lib/edition/contracts/client'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'

export default function SelfHostedAuthEntryCard({ features }: AuthEntryCardProps) {
  const t = useTranslations('auth')
  const router = useRouter()
  const [authMode, setAuthMode] = useState<PasswordAuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const changeMode = (mode: PasswordAuthMode) => {
    if (pending || mode === authMode) return
    setAuthMode(mode)
    setPassword('')
    setPasswordConfirmation('')
    setError('')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const identity = username.trim()
    if (!identity) {
      setError(t('usernameRequired'))
      return
    }
    if (authMode === 'register' && password.length < AUTH_PASSWORD_MIN_LENGTH) {
      setError(t('passwordTooShort', { minimum: AUTH_PASSWORD_MIN_LENGTH }))
      return
    }
    if (authMode === 'register' && password !== passwordConfirmation) {
      setError(t('passwordMismatch'))
      return
    }

    setPending(true)
    setError('')
    try {
      const result = await signIn('credentials', {
        identity,
        password,
        mode: authMode,
        redirect: false,
      })
      if (result?.error === 'RateLimited') {
        setError(t('rateLimited'))
      } else if (result?.error) {
        setError(authMode === 'register'
          ? t('passwordRegistrationFailed')
          : t('passwordAuthFailed'))
      } else {
        router.push(buildAuthenticatedHomeTarget())
        router.refresh()
      }
    } catch {
      setError(t('authError'))
    } finally {
      setPending(false)
    }
  }

  if (!features.enablePasswordAuth || features.passwordAuthIdentity !== 'username') {
    throw new Error('SELF_HOSTED_AUTH_CONTRACT_INVALID')
  }

  return (
    <div className="glass-page min-h-screen">
      <Navbar />
      <main className="flex min-h-[calc(100vh-4rem)] items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <section className="w-full max-w-[420px] rounded-[1.75rem] border border-white/80 bg-white/90 px-5 py-7 text-black shadow-[0_24px_72px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:px-8 sm:py-8">
          <header className="mb-7 text-center">
            <h1 className="text-[1.75rem] font-bold tracking-[-0.025em] sm:text-[2rem]">
              {authMode === 'login' ? t('loginTitle') : t('registerTitle')}
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {authMode === 'login' ? t('loginSubtitlePasswordOnly') : t('registerSubtitle')}
            </p>
          </header>

          <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label={t('authMode')}>
            {(['login', 'register'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={authMode === mode}
                disabled={pending}
                onClick={() => changeMode(mode)}
                className={`h-10 rounded-lg text-sm font-medium transition ${authMode === mode
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'}`}
              >
                {t(mode === 'login' ? 'loginTab' : 'registerTab')}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-2 block text-[13px] font-medium text-slate-700">
                {t('username')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={pending}
                required
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-black outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-[13px] font-medium text-slate-700">
                {t('password')}
              </label>
              <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={setPassword}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                placeholder={authMode === 'register'
                  ? t('newPasswordPlaceholder', { minimum: AUTH_PASSWORD_MIN_LENGTH })
                  : t('passwordPlaceholder')}
                showLabel={t('showPassword')}
                hideLabel={t('hidePassword')}
                required
              />
            </div>
            {authMode === 'register' ? (
              <div>
                <label htmlFor="passwordConfirmation" className="mb-2 block text-[13px] font-medium text-slate-700">
                  {t('confirmPassword')}
                </label>
                <PasswordInput
                  id="passwordConfirmation"
                  name="passwordConfirmation"
                  value={passwordConfirmation}
                  onChange={setPasswordConfirmation}
                  autoComplete="new-password"
                  placeholder={t('confirmPasswordPlaceholder')}
                  showLabel={t('showPassword')}
                  hideLabel={t('hidePassword')}
                  required
                />
              </div>
            ) : null}
            {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
            <button
              type="submit"
              disabled={pending}
              className="glass-btn-base glass-btn-primary h-12 w-full rounded-xl text-sm font-semibold"
            >
              {pending
                ? t(authMode === 'login' ? 'signingIn' : 'registering')
                : t(authMode === 'login' ? 'loginButton' : 'registerButton')}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
