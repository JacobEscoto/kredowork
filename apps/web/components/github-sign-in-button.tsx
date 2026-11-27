'use client'

import { useState } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { useTranslation } from '@/components/language-provider'

export default function GitHubSignInButton() {
  const { translate: t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function signIn() {
    setPending(true)
    setError('')

    try {
      const result = await authClient.signIn.social({
        provider: 'github',
        callbackURL: '/account',
      })

      if (result.error) {
        setError(t('auth.githubSignInFailed'))
        setPending(false)
      }
    } catch {
      setError(t('auth.githubSignInFailed'))
      setPending(false)
    }
  }

  return (
    <div className="github-auth-action">
      <button
        className="register-method social-method github-active"
        type="button"
        onClick={() => void signIn()}
        disabled={pending}
        aria-busy={pending}
      >
        <span className="method-icon github-icon" aria-hidden="true">GH</span>
        <span className="method-copy">
          <strong>{t('register.continueGitHub')}</strong>
          <span>{t('register.githubSub')}</span>
        </span>
        {pending ? <LoaderCircle className="github-spinner" size={16} aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}
      </button>
      {error && <p className="github-auth-error" role="alert">{error}</p>}
    </div>
  )
}
