'use client'

import Link from 'next/link'
import { ArrowDownRight, ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react'
import WalletConnect from '@/components/wallet-connect'
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

export default function HomePage() {
  const { translate: t } = useTranslation()

  return (
    <main className="kw-app landing-page">
      <header className="topbar landing-topbar">
        <Brand />
        <nav className="landing-nav" aria-label={t('common.navAria')}>
          <Link href="/about">{t('nav.about')}</Link>
          <Link href="/bounties">{t('nav.bounties')}</Link>
        </nav>
        <div className="top-actions">
          <span className="network"><span className="network-dot" /> {t('common.solanaDevnet')}</span>
          <WalletConnect />
          <LanguageDropdown />
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-kicker"><span /> {t('home.kicker')}</p>
          <h1>{t('home.workOpen')}<br />{t('home.deserves')} <span>{t('home.rewards')}</span></h1>
          <p className="landing-lede">{t('home.lede')}</p>
          <div className="landing-ctas">
            <Link className="primary-cta" href="/register">
              {t('home.createAccount')} <ArrowRight size={16} />
            </Link>
            <Link className="secondary-cta" href="/about">
              {t('home.learnMore')} <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="landing-trust"><ShieldCheck size={15} /><span>{t('home.devnetTrust')}</span></div>
        </div>
        <aside className="landing-art" aria-label={t('home.workflowAria')}>
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-center"><span className="art-mark"><i /><i /><i /><i /></span><span>KredoWork</span><small>{t('home.trustCaption')}</small></div>
          <div className="art-node node-task"><span className="node-icon"><ArrowDownRight size={16} /></span><strong>{t('home.workOpen')}</strong><small>alcance definido</small></div>
          <div className="art-node node-review"><span className="node-dot" /><strong>{t('about.transparent')}</strong><small>por la comunidad</small></div>
          <div className="art-node node-reward"><span className="node-icon reward-icon">◎</span><strong>{t('home.reward')}</strong><small>en escrow</small></div>
          <span className="art-caption">{t('home.trustCaption')}</span>
        </aside>
      </section>

      <section className="landing-bottom" aria-label={t('home.bottomAria')}>
        <div><span className="landing-bottom-label">{t('home.bottomLabel')}</span><strong>{t('home.bottomStrong')}</strong></div>
        <Link href="/about" className="bottom-link">{t('home.bottomHowItWorks')} <ArrowRight size={15} /></Link>
        <Link href="/bounties" className="bottom-link">{t('home.bottomOpenTasks')} <ArrowRight size={15} /></Link>
      </section>
      <footer className="landing-footer"><Brand /><span>{t('common.openCoordination')}</span><span className="footer-stack">{t('common.builtOnSolana')} <span>·</span> Devnet</span></footer>
    </main>
  )
}
