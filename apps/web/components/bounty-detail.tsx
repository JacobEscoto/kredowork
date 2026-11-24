'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock3, ExternalLink, ShieldCheck, Wallet } from 'lucide-react'
import type { Bounty, BountyStatus } from '@/lib/bounties'

const stages: BountyStatus[] = ['OPEN', 'CLAIMED', 'SUBMITTED', 'PRE_APPROVED', 'COMPLETED']
const stageLabels: Record<BountyStatus, string> = {
  OPEN: 'Open', CLAIMED: 'Claimed', SUBMITTED: 'Submitted', PRE_APPROVED: 'Pre-approved', COMPLETED: 'Completed', EXPIRED: 'Expired', DISPUTED: 'Disputed', REJECTED: 'Rejected',
}
type PreviewRole = 'contributor' | 'reviewer' | 'public' | 'sponsor'

function initialSeconds(bounty: Bounty) {
  if (bounty.status === 'PRE_APPROVED') return 90
  if (bounty.status === 'EXPIRED' || bounty.status === 'COMPLETED' || bounty.status === 'REJECTED') return 0
  const match = bounty.deadline.match(/(?:(\d+)d)?\s*(?:(\d+)h)?/)
  const days = Number(match?.[1] ?? 0)
  const hours = Number(match?.[2] ?? 0)
  return Math.max(60, (days * 24 + hours) * 3600)
}

function formatCountdown(total: number) {
  const seconds = Math.max(0, total)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remaining = seconds % 60
  return days ? `${days}d ${hours}h ${minutes}m` : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`
}

export function BountyDetail({ bounty }: { bounty: Bounty }) {
  const [status, setStatus] = useState<BountyStatus>(bounty.status)
  const [role, setRole] = useState<PreviewRole>('contributor')
  const [secondsLeft, setSecondsLeft] = useState(() => initialSeconds(bounty))
  const [workUrl, setWorkUrl] = useState('')
  const [evidence, setEvidence] = useState('')
  const [deliveryHash, setDeliveryHash] = useState('')
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const activeStage = stages.indexOf(status)
  const claim = () => {
    setStatus('CLAIMED')
    setSecondsLeft(48 * 60 * 60)
    setFeedback('Claim recorded in this preview. No transaction was sent.')
  }
  const submitWork = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = JSON.stringify({ bountyId: bounty.id, url: workUrl.trim(), evidence: evidence.trim() })
    const bytes = new TextEncoder().encode(payload)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    setDeliveryHash(hash)
    setStatus('SUBMITTED')
    setSecondsLeft(24 * 60 * 60)
    setFeedback('Delivery hash created locally. No transaction was sent.')
  }
  const advance = (next: BountyStatus, message: string) => {
    setStatus(next)
    setSecondsLeft(next === 'PRE_APPROVED' ? 90 : 0)
    setFeedback(message)
  }

  return <main className="detail-page">
    <header className="detail-header">
      <Link className="brand" href="/bounties" aria-label="KredoWork home"><span className="brand-mark" aria-hidden="true"><span/><span/><span/><span/></span><span>Kredo<span className="brand-accent">Work</span></span></Link>
      <nav className="detail-nav" aria-label="Main navigation"><Link href="/bounties">Explore</Link><Link href="/workspaces/new">Create a workspace</Link></nav>
      <Link className="detail-wallet-link" href="/profile/7xKp...mR4q"><Wallet size={15}/> Demo profile</Link>
    </header>
    <div className="detail-shell">
      <Link href="/bounties" className="back-link"><ArrowLeft size={15}/> All bounties</Link>
      <div className="detail-heading-row">
        <div className="detail-heading"><div className="detail-id">{bounty.id}<span className={`status status-${status.toLowerCase()}`}><i className="status-dot"/>{stageLabels[status]}</span></div><h1>{bounty.title}</h1><p>{bounty.description}</p></div>
        <div className="detail-reward"><span>Reward in escrow</span><strong>{bounty.amount}<small> SOL</small></strong><em>≈ ${(Number(bounty.amount) * 142.35).toLocaleString('en-US', { maximumFractionDigits: 0 })} USD</em></div>
      </div>
      <section className="status-panel" aria-labelledby="status-title">
        <div className="panel-heading"><div><span className="panel-kicker">Bounty progress</span><h2 id="status-title">Status and timeline</h2></div><span className="network-pill"><i/> Devnet preview</span></div>
        <ol className="status-rail">{stages.map((step, index) => <li key={step} className={`${index < activeStage ? 'is-complete' : ''} ${index === activeStage ? 'is-current' : ''}`}><span className="rail-marker">{index < activeStage ? <Check size={13}/> : null}</span><span>{stageLabels[step]}</span></li>)}</ol>
        {(status === 'OPEN' || status === 'CLAIMED' || status === 'SUBMITTED' || status === 'PRE_APPROVED') && <div className="countdown-row"><Clock3 size={16}/><span>{status === 'PRE_APPROVED' ? 'Optimistic review window' : status === 'OPEN' ? 'Time to claim' : status === 'CLAIMED' ? 'Time to submit' : 'Review window'}</span><strong aria-live="polite">{formatCountdown(secondsLeft)}</strong><span className="countdown-caption">remaining</span></div>}
        {(status === 'REJECTED' || status === 'DISPUTED' || status === 'EXPIRED') && <div className="status-note"><span className={`status status-${status.toLowerCase()}`}><i className="status-dot"/>{stageLabels[status]}</span><span>{status === 'EXPIRED' ? 'The submission deadline has passed.' : status === 'REJECTED' ? 'The reviewer declined this delivery.' : 'A resolution is in progress.'}</span></div>}
      </section>
      <div className="detail-columns">
        <section className="action-panel" aria-labelledby="action-title">
          <div className="panel-heading"><div><span className="panel-kicker">Next step</span><h2 id="action-title">Bounty actions</h2></div><label className="role-preview">Preview role<select aria-label="Preview role" value={role} onChange={(event) => setRole(event.target.value as PreviewRole)}><option value="contributor">Contributor</option><option value="reviewer">Authorized reviewer</option><option value="public">Any wallet</option><option value="sponsor">Sponsor</option></select></label></div>
          <p className="preview-warning"><Wallet size={14}/> Role preview only. Connect a wallet and on-chain program to authorize real actions.</p>
          {status === 'OPEN' && role === 'contributor' && <div className="action-content"><h3>Ready to take this on?</h3><p>Claim the bounty to reserve the work window for your wallet.</p><button className="primary-action" onClick={claim}>Claim bounty <ArrowRight size={15}/></button></div>}
          {status === 'CLAIMED' && role === 'contributor' && <form className="delivery-form" onSubmit={submitWork}><h3>Submit your work</h3><p>Share a public link and a short note about what you completed.</p><label>Work link<input required type="url" value={workUrl} onChange={(event) => setWorkUrl(event.target.value)} placeholder="https://github.com/..." /></label><label>Evidence or notes<textarea required rows={3} value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Summarize the changes and how to verify them" /></label><button className="primary-action" type="submit">Create delivery hash <ArrowRight size={15}/></button></form>}
          {status === 'SUBMITTED' && role === 'reviewer' && <div className="action-content"><h3>Review the delivery</h3><p>Check the submitted evidence before deciding. Approval opens the optimistic review window.</p>{deliveryHash && <div className="delivery-hash"><span>Delivery hash</span><code>{deliveryHash}</code></div>}<div className="action-buttons"><button className="primary-action" onClick={() => advance('PRE_APPROVED', 'Pre-approval recorded in this preview. No transaction was sent.')}>Approve delivery</button><button className="secondary-action danger-action" onClick={() => advance('REJECTED', 'Rejection recorded in this preview. No transaction was sent.')}>Reject delivery</button></div></div>}
          {status === 'PRE_APPROVED' && secondsLeft === 0 && <div className="action-content"><h3>Review window complete</h3><p>Anyone can finalize the bounty and release payment after the optimistic window ends.</p><button className="primary-action" onClick={() => advance('COMPLETED', 'Finalization recorded in this preview. No transaction was sent.')}>Finalize and release payment <ArrowRight size={15}/></button></div>}
          {status === 'EXPIRED' && role === 'sponsor' && <div className="action-content"><h3>No work was submitted</h3><p>As the sponsor, you can reclaim funds after the bounty deadline expires.</p><button className="primary-action" onClick={() => advance('COMPLETED', 'Expired funds reclaimed in this preview. No transaction was sent.')}>Reclaim expired funds <ArrowRight size={15}/></button></div>}
          {status === 'COMPLETED' && <div className="action-content completion-state"><span><Check size={18}/></span><div><h3>Bounty completed</h3><p>The preview shows the bounty as settled.</p></div></div>}
          {!((status === 'OPEN' && role === 'contributor') || (status === 'CLAIMED' && role === 'contributor') || (status === 'SUBMITTED' && role === 'reviewer') || (status === 'PRE_APPROVED' && secondsLeft === 0) || (status === 'EXPIRED' && role === 'sponsor') || status === 'COMPLETED') && <div className="action-empty"><ShieldCheck size={19}/><p>No action is available for this role and status.</p><span>Choose another preview role to inspect its permissions.</span></div>}
          {feedback && <p className="action-feedback" role="status">{feedback}</p>}
        </section>
        {(status === 'PRE_APPROVED' && secondsLeft > 0 || status === 'REJECTED') && <section className="dispute-panel" aria-labelledby="dispute-title"><div className="dispute-icon"><ShieldCheck size={17}/></div><div className="dispute-copy"><span className="panel-kicker">Resolution area</span><h2 id="dispute-title">Disputes</h2><p>{status === 'REJECTED' ? 'A dispute can be opened after a rejected delivery.' : 'The optimistic review window is still active.'}</p><button type="button" className="disabled-dispute" disabled>Open a dispute <span>Coming soon</span></button></div><div className="arbitration-reserve"><div><span>Arbitration bond</span><strong>—</strong></div><div><span>Arbitrator votes</span><strong>—</strong></div><small>Dispute tools will appear here when arbitration is available.</small></div></section>}
        <aside className="bounty-meta-panel"><h2>Details</h2><dl><div><dt>Category</dt><dd>{bounty.category}</dd></div><div><dt>Approval method</dt><dd>{bounty.approval}</dd></div><div><dt>Posted</dt><dd>{bounty.posted}</dd></div><div><dt>Specification hash</dt><dd><code>{bounty.hash}</code></dd></div></dl><Link href="/profile/7xKp...mR4q" className="meta-profile-link">View demo reputation <ExternalLink size={13}/></Link></aside>
      </div>
    </div>
  </main>
}
