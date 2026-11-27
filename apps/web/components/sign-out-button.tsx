'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, LoaderCircle } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { useTranslation } from '@/components/language-provider'

export default function SignOutButton() {
  const router = useRouter()
  const { translate: t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function signOut() {
    setPending(true)
    setError('')

    try {
      const result = await authClient.signOut()
      if (result.error) {
        setError(t('auth.signOutFailed'))
        setPending(false)
        return
      }

      router.replace('/register')
      router.refresh()
    } catch {
      setError(t('auth.signOutFailed'))
      setPending(false)
    }
  }

  return (
    <div className="account-signout-wrap">
      <button className="account-signout" type="button" onClick={() => void signOut()} disabled={pending}>
        {pending ? <LoaderCircle className="github-spinner" size={15} aria-hidden="true" /> : <LogOut size={15} aria-hidden="true" />}
        {pending ? t('auth.signingOut') : t('auth.signOut')}
      </button>
      {error && <p className="github-auth-error" role="alert">{error}</p>}
    </div>
  )
}
