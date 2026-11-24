'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Copy, Hash, ShieldCheck, Wallet } from 'lucide-react'

async function createSpecHash(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function NewBountyForm() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [criteria, setCriteria] = useState('')
  const [workspace, setWorkspace] = useState('Core Infrastructure')
  const [reward, setReward] = useState('')
  const [deadline, setDeadline] = useState('')
  const [specHash, setSpecHash] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [copied, setCopied] = useState(false)
  const [walletMessage, setWalletMessage] = useState(false)

  useEffect(() => {
    let current = true
    const specification = JSON.stringify({ title: title.trim(), description: description.trim(), criteria: criteria.trim() })
    if (!title.trim() && !description.trim() && !criteria.trim()) {
      setSpecHash('')
      return () => { current = false }
    }
    createSpecHash(specification).then((hash) => { if (current) setSpecHash(hash) })
    return () => { current = false }
  }, [title, description, criteria])

  const copyHash = async () => {
    if (!specHash) return
    await navigator.clipboard?.writeText(specHash)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }
  const formatDeadline = () => deadline ? new Date(`${deadline}T12:00:00`).toLocaleDateString('en', { dateStyle: 'medium' }) : 'Sin definir'

  return <main className="flow-page">
    <header className="flow-header"><Link className="flow-brand" href="/bounties" aria-label="KredoWork home"><span className="brand-mark" aria-hidden="true"><span/><span/><span/><span/></span><span>Kredo<span className="brand-accent">Work</span></span></Link><Link className="flow-back" href="/bounties"><ArrowLeft size={15}/> Back to bounties</Link></header>
    <div className="flow-layout">
      <section className="flow-content" aria-labelledby="bounty-create-title">
        <div className="flow-progress"><span className="progress-current">01</span><span className="progress-line"/><span>POST A BOUNTY</span></div>
        <h1 id="bounty-create-title" className="flow-title">Clear work.<br/>Real impact<span>.</span></h1>
        <p className="flow-lede">Define the task, how it will be verified, and the reward held in escrow.</p>
        {!showReview ? <form className="flow-form" onSubmit={async (event) => { event.preventDefault(); const finalHash = await createSpecHash(JSON.stringify({ title: title.trim(), description: description.trim(), criteria: criteria.trim() })); setSpecHash(finalHash); setShowReview(true); setWalletMessage(false) }}>
          <div className="form-section-head"><span>01</span><h2>Define the work</h2></div>
          <label className="form-field"><span>Task title <b>Required</b></span><input required maxLength={90} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Add RPC availability alerts"/></label>
          <label className="form-field"><span>Workspace</span><select value={workspace} onChange={(event) => setWorkspace(event.target.value)}><option>Core Infrastructure</option><option>Validator Collective</option><option>RPC Network</option></select></label>
          <label className="form-field"><span>Summary <b>Required</b></span><textarea required rows={3} maxLength={600} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Task context and scope"/></label>
          <label className="form-field"><span>Acceptance criteria <b>Required</b></span><textarea required rows={5} maxLength={3000} value={criteria} onChange={(event) => setCriteria(event.target.value)} placeholder={'Describe how the result will be checked\nOne criterion per line'} /><small>These criteria are used to create a SHA-256 fingerprint of the specification.</small></label>
          <div className="hash-preview"><div className="hash-preview-label"><Hash size={15}/><span>SPECIFICATION SHA-256 HASH</span><span className="hash-live"><i/> Calculated on this device</span></div><code>{specHash || 'Add a title, summary, and criteria to calculate the hash'}</code></div>
          <div className="form-section-head reward-head"><span>02</span><h2>Reward and deadline</h2></div>
          <div className="reward-deadline-grid"><label className="form-field"><span>Reward in escrow</span><div className="number-field"><input type="number" min="0.001" max="1000000" step="0.001" required value={reward} onChange={(event) => setReward(event.target.value)} placeholder="0.00"/><span>SOL</span></div></label><label className="form-field"><span>Deadline</span><input type="text" required inputMode="numeric" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" title="Use the year-month-day format" placeholder="YYYY-MM-DD" value={deadline} onChange={(event) => setDeadline(event.target.value)}/></label></div>
          <button className="flow-submit" type="submit">Review bounty <ArrowRight size={16}/></button>
        </form> : <div className="review-panel"><div className="review-icon"><ShieldCheck size={20}/></div><h2>Review before signing</h2><p>Check the details and hash before continuing.</p><dl><div><dt>Task</dt><dd>{title}</dd></div><div><dt>Workspace</dt><dd>{workspace}</dd></div><div><dt>Reward in escrow</dt><dd>{reward} SOL</dd></div><div><dt>Deadline</dt><dd>{formatDeadline()}</dd></div><div className="fee-row"><dt>Protocol fee (at settlement):</dt><dd>Pending / 0% in preview</dd></div></dl><div className="review-hash"><span>SPEC HASH</span><code>{specHash}</code><button type="button" onClick={copyHash} aria-label="Copy SHA-256 hash">{copied ? <Check size={15}/> : <Copy size={15}/>}</button></div><button type="button" className="flow-submit" onClick={() => setWalletMessage(true)}><Wallet size={16}/> Connect wallet to sign</button>{walletMessage && <p className="chain-note" role="status">Wallet connection and on-chain submission will be available when the Solana program is integrated.</p>}<button type="button" className="edit-link" onClick={() => setShowReview(false)}>Back to editing</button></div>}
      </section>
      <aside className="flow-aside"><div className="aside-index">KREDOWORK / MICRO BOUNTIES</div><div className="aside-mark" aria-hidden="true"><span/><span/><span/><span/></div><h2>Verifiable<br/>from the start.</h2><p>The SHA-256 hash identifies the task terms before a transaction is prepared.</p><div className="aside-facts"><div><span className="fact-number">01</span><span>Hashed specification</span></div><div><span className="fact-number">02</span><span>Reward visible in escrow</span></div><div><span className="fact-number">03</span><span>Clear deadline for everyone</span></div></div><Link href="/workspaces/new" className="aside-link">Create a workspace <ArrowRight size={14}/></Link></aside>
    </div>
  </main>
}
