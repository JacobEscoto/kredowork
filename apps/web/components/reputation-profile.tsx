import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CircleUserRound,
  Wallet,
} from "lucide-react";

const demoWallet = "7xKp...mR4q";

export function ReputationProfile({ wallet }: { wallet: string }) {
  const hasActivity = wallet === demoWallet;
  return (
    <main className="profile-page">
      <header className="detail-header">
        <Link className="brand" href="/bounties" aria-label="KredoWork home">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>
            Kredo<span className="brand-accent">Work</span>
          </span>
        </Link>
        <nav className="detail-nav" aria-label="Main navigation">
          <Link href="/bounties">Explore</Link>
          <Link href="/workspaces/new">Create a workspace</Link>
        </nav>
        <Link className="detail-wallet-link" href="/bounties">
          <Wallet size={15} /> Bounty board
        </Link>
      </header>
      <div className="profile-shell">
        <Link href="/bounties" className="back-link">
          <ArrowLeft size={15} /> All bounties
        </Link>
        <section className="profile-hero">
          <div className="profile-avatar">
            <CircleUserRound size={30} />
          </div>
          <div className="profile-identity">
            <span className="panel-kicker">Contributor profile</span>
            <h1>{hasActivity ? "KredoWork contributor" : "New contributor"}</h1>
            <p className="wallet-address">{wallet}</p>
          </div>
          {hasActivity && (
            <span className="profile-badge">
              <BadgeCheck size={15} /> On-chain activity
            </span>
          )}
        </section>
        {hasActivity ? (
          <>
            <div className="profile-stats">
              <article>
                <span>Bounties completed</span>
                <strong>12</strong>
                <small>Across 4 workspaces</small>
              </article>
              <article>
                <span>Earned</span>
                <strong>
                  1,840 <em>SOL</em>
                </strong>
                <small>Released from escrow</small>
              </article>
              <article>
                <span>Reviews completed</span>
                <strong>8</strong>
                <small>Authorized reviewer activity</small>
              </article>
            </div>
            <section className="profile-history">
              <div>
                <span className="panel-kicker">Recent activity</span>
                <h2>Work that speaks for itself</h2>
              </div>
              <p>
                Reputation counters are a preview until connected to the
                on-chain ReputationProfile account.
              </p>
              <Link href="/bounties" className="profile-cta">
                Explore open bounties <ArrowUpRight size={15} />
              </Link>
            </section>
          </>
        ) : (
          <section className="profile-empty">
            <span className="empty-profile-icon">
              <CircleUserRound size={24} />
            </span>
            <h2>No reputation activity yet</h2>
            <p>
              This wallet&apos;s profile will be initialized after its first
              bounty is completed or reviewed.
            </p>
            <Link href="/bounties" className="profile-cta">
              Explore open bounties <ArrowUpRight size={15} />
            </Link>
            <small>
              Profile data is a UI preview and is not yet connected to the
              reputation program.
            </small>
          </section>
        )}
      </div>
    </main>
  );
}
