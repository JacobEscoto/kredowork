'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, CircleDollarSign, FileCheck2, GitPullRequest, ShieldCheck, Clock, Scale, Gavel } from 'lucide-react'
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

export default function AboutPage() {
  const { translate: t } = useTranslation()

  const steps = [
    { icon: GitPullRequest, title: t('about.step1Title'), body: t('about.step1Body') },
    { icon: FileCheck2, title: t('about.step2Title'), body: t('about.step2Body') },
    { icon: CircleDollarSign, title: t('about.step3Title'), body: t('about.step3Body') },
  ]

  return (
    <main className="kw-app about-page">
      <header className="topbar auth-topbar">
        <Brand />
        <div className="top-actions">
          <Link className="auth-back" href="/"><ArrowLeft size={14} /> {t('common.backHome')}</Link>
          <LanguageDropdown />
        </div>
      </header>
      <section className="about-hero">
        <p className="landing-kicker"><span /> {t('about.kicker')}</p>
        <h1>{t('about.clearerWay')}<br />{t('about.toBuild')} <span>{t('about.together')}</span></h1>
        <p>{t('about.intro')}</p>
      </section>
      <section className="about-principles" aria-label={t('common.navAria')}>
        {steps.map(({ icon: Icon, title, body }, index) => (
          <article className="principle" key={title}>
            <span className="principle-index">0{index + 1}</span>
            <div className="principle-icon"><Icon size={19} /></div>
            <h2>{title}</h2>
            <p>{body}</p>
            <span className="principle-check"><Check size={13} /> {t('about.transparent')}</span>
          </article>
        ))}
      </section>
      <section className="about-guarantees" aria-label={t('about.guaranteesKicker')}>
        <div>
          <span className="landing-kicker">{t('about.guaranteesKicker')}</span>
          <h2>{t('about.guaranteesTitle')}</h2>
          <p>{t('about.guaranteesSubtitle')}</p>
        </div>
        <div className="guarantee-grid">
          {[
            { icon: ShieldCheck, title: t('about.guarantee1Title'), body: t('about.guarantee1Body') },
            { icon: Clock, title: t('about.guarantee2Title'), body: t('about.guarantee2Body') },
            { icon: Scale, title: t('about.guarantee3Title'), body: t('about.guarantee3Body') },
            { icon: Gavel, title: t('about.guarantee4Title'), body: t('about.guarantee4Body') },
          ].map(({ icon: Icon, title, body }, index) => (
            <article className="guarantee" key={title}>
              <div className="guarantee-icon"><Icon size={17} /></div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="about-flow" aria-label={t('about.flowKicker')}>
        <div>
          <span className="landing-kicker">{t('about.flowKicker')}</span>
          <h2>{t('about.flowTitle')}</h2>
        </div>
        <div className="flow-list">
          {[
            t('about.flowItem1'),
            t('about.flowItem2'),
            t('about.flowItem3'),
            t('about.flowItem4'),
          ].map((item, index) => (
            <article className="flow-step" key={item}>
              <span className="flow-index">0{index + 1}</span>
              <div className="flow-copy">
                <p>{item}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="about-callout">
        <div>
          <span className="landing-bottom-label">{t('about.calloutLabel')}</span>
          <h2>{t('about.calloutTitle1')}<br />{t('about.calloutTitle2')}</h2>
        </div>
        <Link className="primary-cta" href="/register">{t('home.createAccount')} <ArrowRight size={16} /></Link>
      </section>
      <footer className="landing-footer"><Brand /><span>{t('common.openCoordination')}</span><span className="footer-stack">{t('common.builtOnSolana')} <span>·</span> Devnet</span></footer>
    </main>
  )
}
