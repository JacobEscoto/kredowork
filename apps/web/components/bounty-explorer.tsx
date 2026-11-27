'use client'

import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowRight, Check, ChevronDown, Copy, ExternalLink, Menu, Search, ShieldCheck, X } from 'lucide-react'
import WalletConnect from '@/components/wallet-connect'
import { LanguageDropdown } from '@/components/language-dropdown'
import { useTranslation } from '@/components/language-provider'

type Status = 'OPEN' | 'CLAIMED' | 'SUBMITTED' | 'PRE_APPROVED' | 'COMPLETED' | 'EXPIRED' | 'DISPUTED'
type Bounty = { id: string; title: string; summary: string; amount: number; status: Status; deadline: string; days: number; approval: string; hash: string; space: string; initials: string }

const statuses: Status[] = ['OPEN', 'CLAIMED', 'SUBMITTED', 'PRE_APPROVED', 'COMPLETED', 'EXPIRED', 'DISPUTED']
const statusColors: Record<Status, string> = { OPEN: 'open', CLAIMED: 'claimed', SUBMITTED: 'submitted', PRE_APPROVED: 'preapproved', COMPLETED: 'completed', EXPIRED: 'expired', DISPUTED: 'disputed' }
const bounties: Bounty[] = [
  { id: 'KW-0248', title: 'Harden RPC failover logic', summary: 'Add resilient endpoint rotation and health checks to the validator monitoring client.', amount: 420, status: 'OPEN', deadline: 'Nov 29, 2026', days: 4, approval: 'Peer review', hash: '7f3a…c92d', space: 'Solana Core', initials: 'SC' },
  { id: 'KW-0246', title: 'Document snapshot restore flow', summary: 'Write an operator guide for restoring validator snapshots with verified checksums.', amount: 185, status: 'OPEN', deadline: 'Dec 02, 2026', days: 7, approval: 'Maintainer approval', hash: '2b91…f6a1', space: 'Validators Guild', initials: 'VG' },
  { id: 'KW-0243', title: 'Add metrics for vote latency', summary: 'Expose vote transaction latency as a Prometheus histogram with useful buckets.', amount: 320, status: 'CLAIMED', deadline: 'Nov 27, 2026', days: 2, approval: 'Peer review', hash: 'a804…1de7', space: 'Solana Core', initials: 'SC' },
  { id: 'KW-0241', title: 'Audit alert thresholds', summary: 'Review current alert rules and tune thresholds to reduce noisy validator pages.', amount: 260, status: 'SUBMITTED', deadline: 'Nov 30, 2026', days: 5, approval: 'Maintainer approval', hash: '6c0e…b552', space: 'Infra Observability', initials: 'IO' },
  { id: 'KW-0238', title: 'Improve gossip peer discovery', summary: 'Handle stale peer records during discovery and add regression coverage.', amount: 540, status: 'PRE_APPROVED', deadline: 'Dec 04, 2026', days: 9, approval: 'Peer review', hash: 'e149…0ac3', space: 'Solana Core', initials: 'SC' },
  { id: 'KW-0235', title: 'Update archival node runbook', summary: 'Clarify disk sizing and retention guidance for long-running archival nodes.', amount: 150, status: 'COMPLETED', deadline: 'Nov 22, 2026', days: 0, approval: 'Maintainer approval', hash: 'c23d…8fb0', space: 'Validators Guild', initials: 'VG' },
]

function MiniMark() {
  return <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
}

export default function BountyExplorer() {
  const { translate: t } = useTranslation()
  const [active, setActive] = useState<Status>('OPEN')
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const filtered = useMemo(() => bounties.filter((bounty) => bounty.status === active && `${bounty.title} ${bounty.summary} ${bounty.space}`.toLowerCase().includes(query.toLowerCase())), [active, query])

  const statusLabel = (status: Status) => t(`bounties.status.${status}`)
  const totalByStatus = (status: Status) => bounties.filter((item) => item.status === status).length
  const statusColor = (status: Status) => statusColors[status]

  async function copyHash(hash: string) {
    const fullHash = hash.replace('…', '000000000000000000000000000000000000')
    try { await navigator.clipboard.writeText(fullHash); setCopied(hash); window.setTimeout(() => setCopied(null), 1600) } catch { setCopied(null) }
  }

  return (
    <main className="kw-app">
      <header className="topbar">
        <a className="brand" href="/" aria-label={t('common.brandHome')}>
          <MiniMark /><span>Kredo<span className="brand-light">Work</span></span>
        </a>
        <nav className={`main-nav ${mobileNav ? 'nav-open' : ''}`} aria-label={t('common.navAria')}>
          <a className="nav-link active" href="/bounties">{t('nav.bounties')}</a>
          <a className="nav-link" href="/about">{t('nav.about')}</a>
          <a className="nav-link" href="/register">{t('nav.register')}</a>
        </nav>
        <div className="top-actions">
          <span className="network"><span className="network-dot" /> {t('common.solanaDevnet')}</span>
          <WalletConnect />
          <LanguageDropdown />
        </div>
        <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label={mobileNav ? t('common.closeMenu') : t('common.openMenu')}>{mobileNav ? <X /> : <Menu />}</button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> {t('bounties.kicker')}</div><h1>{t('home.workOpen')}<br />{t('home.deserves')} <span>{t('home.rewards')}</span><span className="hero-period">.</span></h1><p>{t('bounties.title')}</p><a className="text-link" href="#bounties">{t('home.bottomOpenTasks')} <ArrowRight size={16} /></a></div>
        <aside className="hero-proof" aria-label={t('bounties.proofAria')}>
          <div className="proof-top"><ShieldCheck size={19} /><span>{t('bounties.proofOpen')}</span><span className="proof-dot" /></div><div className="proof-stat"><strong>1,284</strong><span>{t('bounties.proofTasks')}</span></div><div className="proof-divider" /><div className="proof-foot"><span>{t('bounties.proofNoMasterKey')}</span><span>{t('bounties.proofEscrow')}</span></div><div className="proof-stamp">KW / 01</div></aside>
        <div className="hero-index" aria-hidden="true"><span>01</span><span className="index-rule" /><span>03</span></div>
      </section>

      <section className="market" id="bounties">
        <div className="market-heading"><div><div className="section-kicker">{t('bounties.kicker')}</div><h2>{t('bounties.title')}</h2></div><div className="market-aside"><span className="live-indicator" /><span>{t('bounties.updated')}</span><a href="#bounties" aria-label={t('bounties.viewAllTasks')}><ArrowDownRight size={17} /></a></div></div>
        <div className="market-toolbar"><div className="filter-tabs" role="tablist" aria-label={t('bounties.filterLabel')}>{statuses.map((status) => <button key={status} role="tab" aria-selected={active === status} className={`filter-tab ${active === status ? 'selected' : ''}`} onClick={() => setActive(status)}>{statusLabel(status)}<span className="tab-count">{totalByStatus(status) || '—'}</span></button>)}</div><label className="search-box"><Search size={16} /><span className="sr-only">{t('bounties.searchAria')}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('bounties.searchPlaceholder')} /></label></div>
        <div className="list-head"><span>{t('bounties.listHeadTask')}</span><span>{t('bounties.listHeadEscrow')}</span><span>{t('bounties.listHeadDeadline')}</span><span>{t('bounties.listHeadApproval')}</span><span>{t('bounties.listHeadSpec')}</span><span aria-hidden="true" /></div>
        <div className="bounty-list" role="tabpanel" aria-label={`Bounties ${statusLabel(active).toLowerCase()}`}>
          {filtered.length ? filtered.map((bounty) => <article className="bounty-row" key={bounty.id}>
            <div className="task-cell"><div className="space-avatar">{bounty.initials}</div><div className="task-copy"><div className="task-title-line"><h3>{bounty.title}</h3><span className={`status status-${statusColor(bounty.status)}`}><i />{statusLabel(bounty.status)}</span></div><p>{bounty.summary}</p><span className="space-name">{bounty.space}<span className="task-id">{bounty.id}</span></span></div></div>
            <div className="amount-cell"><strong>{bounty.amount.toLocaleString()} <span>SOL</span></strong><small>{t('bounties.vaultLocked')}</small></div>
            <div className="deadline-cell"><strong>{bounty.deadline}</strong><small className={bounty.days <= 2 ? 'urgent' : ''}>{bounty.days ? t('bounties.daysRemaining', { days: bounty.days }) : t('bounties.finished')}</small></div>
            <div className="approval-cell"><span>{bounty.approval}</span><ChevronDown size={13} /></div>
            <button className="hash-button" onClick={() => copyHash(bounty.hash)} aria-label={t('bounties.copyHash', { hash: bounty.hash })}>{copied === bounty.hash ? <Check size={14} /> : <Copy size={14} />}<code>{bounty.hash}</code></button>
            <button className="row-open" aria-label={t('bounties.viewBounty', { title: bounty.title })}><ExternalLink size={16} /></button>
          </article>) : <div className="empty-state"><div className="empty-mark"><MiniMark /></div>
            <h3>{query ? t('bounties.emptyTitleQuery') : t('bounties.emptyNone', { status: statusLabel(active).toLowerCase() })}</h3>
            <p>{query ? t('bounties.emptySubQuery') : active === 'DISPUTED' ? t('bounties.emptyDisputed') : t('bounties.emptyDefault')}</p>
            {!query && <button onClick={() => setActive('OPEN')}>{t('home.bottomOpenTasks')} <ArrowRight size={14} /></button>}
          </div>}
        </div>
        <div className="list-footer"><span>{t('bounties.showing', { from: filtered.length, to: totalByStatus(active) })}</span><button onClick={() => setActive('OPEN')}>{t('bounties.viewAllTasks')} <ArrowRight size={15} /></button></div>
      </section>

      <footer className="site-footer" id="how-it-works"><a className="brand footer-brand" href="#top"><MiniMark /><span>Kredo<span className="brand-light">Work</span></span></a><span>{t('common.openCoordination')}</span><span className="footer-stack">{t('bounties.footerBuilt')}</span></footer>
    </main>
  )
}
