'use client'

import Link from 'next/link'
import { ArrowLeft, Wallet as WalletIcon } from 'lucide-react'
import WalletConnect from '@/components/wallet-connect'
import GitHubSignInButton from '@/components/github-sign-in-button'
import { LanguageDropdown } from '@/components/language-dropdown'
import { useTranslation } from '@/components/language-provider'

function Brand() {
  const { translate: t } = useTranslation()
  return (
    <Link className="brand" href="/" aria-label={t('common.brandHome')}>
      <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
      <span>Kredo<span className="brand-light">Work</span></span>
    </Link>
  )
}

export default function RegisterPage() {
  const { translate: t } = useTranslation()

  return (
    <main className="kw-app auth-page">
      <header className="topbar auth-topbar">
        <Brand />
        <div className="top-actions">
          <Link className="auth-back" href="/"><ArrowLeft size={14} /> {t('common.backHome')}</Link>
          <LanguageDropdown />
        </div>
      </header>
      <section className="register-layout">
        <div className="register-intro">
          <p className="landing-kicker"><span /> {t('register.kicker')}</p>
          <h1>{t('register.enter')}<br />{t('register.conversation')}</h1>
          <p>{t('register.intro')}</p>
          <div className="register-note"><span className="network-dot" /><span>{t('register.networkNote')}</span></div>
        </div>
        <div className="register-panel">
          <h2>{t('register.createAccount')}</h2>
          <p className="register-subtitle">{t('register.chooseMethod')}</p>
          <div className="register-method wallet-method">
            <div className="method-icon"><WalletIcon size={17} /></div>
            <div className="method-copy"><strong>{t('register.connectWallet')}</strong><span>{t('register.solanaDevnet')}</span></div>
            <WalletConnect />
          </div>
          <GitHubSignInButton />
          <p className="oauth-note">{t('register.oauthNote')}</p>
          <p className="register-legal">{t('register.legal')}</p>
        </div>
      </section>
      <footer className="auth-footer"><Brand /><span>{t('common.builtForMaintainers')}</span></footer>
    </main>
  )
}
