'use client'

import { useMemo, useState } from 'react'
import { ArrowDownUp, ArrowRight, Check, ChevronDown, Clock3, Copy, ExternalLink, Filter, Globe2, Menu, Plus, Search, ShieldCheck, Wallet, X } from 'lucide-react'
import { bounties, type BountyStatus } from '@/lib/bounties'

type Status = BountyStatus

const filters: { label: string; value: Status | 'ALL' }[] = [
  { label: 'All', value: 'ALL' }, { label: 'Open', value: 'OPEN' }, { label: 'Claimed', value: 'CLAIMED' },
  { label: 'Submitted', value: 'SUBMITTED' }, { label: 'Pre-approved', value: 'PRE_APPROVED' }, { label: 'Completed', value: 'COMPLETED' }, { label: 'Expired', value: 'EXPIRED' }, { label: 'Disputed', value: 'DISPUTED' }, { label: 'Rejected', value: 'REJECTED' },
]
const statusNames: Record<Status, string> = { OPEN: 'Open', CLAIMED: 'Claimed', SUBMITTED: 'Submitted', PRE_APPROVED: 'Pre-approved', COMPLETED: 'Completed', EXPIRED: 'Expired', DISPUTED: 'Disputed', REJECTED: 'Rejected' }

function BrandMark() { return <div className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></div> }

export function BountyMarketplace() {
  const [active, setActive] = useState<Status | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [wallet, setWallet] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [sortNewest, setSortNewest] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const visible = useMemo(() => {
    const filtered = bounties.filter((item) => (active === 'ALL' || item.status === active) && `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(search.toLowerCase()))
    return sortNewest ? filtered : [...filtered].reverse()
  }, [active, search, sortNewest])
  const copyHash = async (hash: string, id: string) => {
    await navigator.clipboard?.writeText(hash.replace('…', ''))
    setCopied(id)
    window.setTimeout(() => setCopied(null), 1600)
  }

  return <main className="marketplace">
    <header className="site-header">
      <a href="/bounties" className="brand" aria-label="KredoWork home"><BrandMark /><span>Kredo<span className="brand-accent">Work</span></span></a>
      <nav className={menuOpen ? 'main-nav nav-open' : 'main-nav'} aria-label="Main navigation"><a className="nav-link active" href="/bounties">Explore</a><a className="nav-link" href="#how-it-works">How it works</a><a className="nav-link" href="#protocol">Protocol</a><a className="nav-link" href="/profile/7xKp...mR4q">Reputation</a><a className="nav-link mobile-nav-link" href="/workspaces/new">Create a workspace <ArrowRight size={14}/></a></nav>
      <div className="header-actions"><a href="/workspaces/new" className="spaces-link">Create a workspace <ArrowRight size={14}/></a><button className={wallet ? 'wallet-button connected' : 'wallet-button'} aria-label="Toggle demo wallet" onClick={() => setWallet(!wallet)}><Wallet size={16}/>{wallet ? '7xKp…mR4q' : 'Preview wallet'}</button><button className="menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20}/> : <Menu size={20}/>}</button></div>
    </header>
    <section className="intro" id="spaces">
      <div className="intro-main"><div><h1>Work that moves<br/>the network <span>forward.</span></h1><p className="intro-copy">Discover open infrastructure tasks, contribute your expertise, and earn transparent rewards, all coordinated onchain.</p></div><a className="create-link" href="/bounties/new"><span className="create-icon"><Plus size={17}/></span> Create a bounty <ArrowRight size={15}/></a></div>
      <div className="stats-row"><div className="stat"><span className="stat-value">$12,480</span><span className="stat-label">Total in escrow</span></div><div className="stat"><span className="stat-value">24</span><span className="stat-label">Open bounties</span></div><div className="stat"><span className="stat-value">86</span><span className="stat-label">Tasks completed</span></div><div className="stat network-stat"><span className="network-indicator"/> Devnet <span className="network-divider">·</span> <span className="network-extra"><Globe2 size={13}/> Open protocol</span></div></div>
    </section>
    <section className="list-section" aria-labelledby="bounty-heading">
      <div className="section-heading"><div><div className="section-kicker">THE OPEN TASK BOARD</div><h2 id="bounty-heading">Explore bounties <span className="result-count">{visible.length.toString().padStart(2, '0')}</span></h2></div><div className="list-controls"><label className="search-box"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." aria-label="Search bounties"/><kbd>⌘ K</kbd></label><button className="sort-button" onClick={() => setSortNewest(!sortNewest)} aria-label="Toggle sort order"><ArrowDownUp size={15}/><span>{sortNewest ? 'Newest' : 'Oldest'}</span><ChevronDown size={14}/></button><button className="filter-icon-button" aria-label="Filter bounties" onClick={() => setActive(active === 'ALL' ? 'OPEN' : 'ALL')}><Filter size={16}/></button></div></div>
      <div className="filter-scroll" role="tablist" aria-label="Filter by bounty status">{filters.map((filter) => <button key={filter.value} role="tab" aria-selected={active === filter.value} className={active === filter.value ? 'filter-tab selected' : 'filter-tab'} onClick={() => setActive(filter.value)}>{filter.label}<span className="tab-count">{filter.value === 'ALL' ? bounties.length : bounties.filter((bounty) => bounty.status === filter.value).length}</span></button>)}</div>
      <div className="bounty-list">{visible.map((bounty, index) => <article className="bounty-card" key={bounty.id} style={{ animationDelay: `${index * 55}ms` }}><div className="card-topline"><span className="bounty-id">{bounty.id}</span><span className={`status status-${bounty.status.toLowerCase()}`}><span className="status-dot"/>{statusNames[bounty.status]}</span><span className="posted-time">Posted {bounty.posted}</span><span className="card-category">{bounty.category}</span></div><div className="card-main"><div className="card-description"><h3>{bounty.title}</h3><p>{bounty.description}</p><button className="hash-button" onClick={() => copyHash(bounty.hash, bounty.id)} aria-label={`Copy spec hash ${bounty.hash}`}><span className="hash-prefix">SPEC</span><span className="hash-value">{bounty.hash}</span>{copied === bounty.id ? <Check size={13} className="copied-icon"/> : <Copy size={13}/>}</button></div><div className="card-reward"><span className="reward-label">LOCKED IN ESCROW</span><span className="reward-amount">{bounty.amount}<span> SOL</span></span><span className="reward-usd">≈ ${(Number(bounty.amount) * 142.35).toLocaleString('en-US', { maximumFractionDigits: 0 })} USD</span></div><div className="card-details"><div className="detail-item"><span className="detail-label"><Clock3 size={13}/> DEADLINE</span><span className="detail-value">{bounty.deadline}</span></div><div className="detail-item"><span className="detail-label"><ShieldCheck size={13}/> APPROVAL</span><span className="detail-value">{bounty.approval}</span></div></div><a className="card-arrow" href={`/bounties/${bounty.id}`} aria-label={`View ${bounty.title}`}><ArrowRight size={18}/></a></div></article>)}
      {visible.length === 0 && <div className="empty-state"><div className="empty-icon"><Search size={21}/></div><h3>No bounties found</h3><p>{active === 'DISPUTED' ? 'Disputed bounties will appear here when a resolution is in progress.' : 'Try adjusting your search or selecting a different status.'}</p><button onClick={() => { setActive('ALL'); setSearch('') }}>Clear filters <ArrowRight size={14}/></button></div>}</div>
      <div className="list-footer"><span>Showing <strong>{visible.length}</strong> of <strong>{bounties.length}</strong> bounties</span><button onClick={() => setSortNewest(!sortNewest)}>Explore all tasks <ArrowRight size={14}/></button></div>
    </section>
    <footer className="site-footer" id="protocol"><div className="footer-brand"><BrandMark/><span>Kredo<span className="brand-accent">Work</span></span></div><span>Open infrastructure, built together.</span><a href="#how-it-works">Built on Anchor + Rust <ExternalLink size={12}/></a><span className="footer-version">PROTOCOL V0.1</span></footer>
  </main>
}
