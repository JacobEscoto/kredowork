import Link from "next/link";
import Brand from "@/components/brand";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CircleUserRound,
  Wallet,
} from "lucide-react";
import type { ReputationMetrics } from "@/lib/marketplace";

export function ReputationProfile({
  wallet,
  profile,
}: {
  wallet: string;
  profile: ReputationMetrics | null;
}) {
  const hasActivity = Boolean(profile && (
    profile.bounties_completed || profile.bounties_failed ||
    profile.reviews_completed || profile.arbitrations_cast
  ));
  return (
    <main className="min-h-screen max-w-[1440px] mx-auto px-[6.25%] flex flex-col max-[1050px]:px-[4%] max-[760px]:px-[22px] max-[460px]:px-[17px]">
      <header className="h-[78px] flex items-center border-b border-line gap-14 max-[1050px]:gap-9 max-[760px]:h-[66px] max-[760px]:gap-4">
        <Brand />
        <nav
          className="flex items-center gap-8 max-[760px]:hidden [&_a]:text-[13px] [&_a]:text-[#74776f] [&_a]:no-underline [&_a:hover]:text-[#161812]"
          aria-label="Main navigation"
        >
          <Link href="/bounties">Explore</Link>
          <Link href="/workspaces/new">Create a workspace</Link>
        </nav>
        <Link
          className="ml-auto inline-flex items-center gap-2 py-2 px-3.5 rounded-md border border-[#191b16] bg-[#171a15] text-white no-underline text-xs transition-colors duration-200 hover:bg-[#353a30]"
          href="/bounties"
        >
          <Wallet size={15} /> Bounty board
        </Link>
      </header>
      <div className="w-full max-w-[920px] mx-auto py-12 flex-1">
        <Link
          href="/bounties"
          className="inline-flex items-center gap-2 text-[#71766e] no-underline text-xs hover:text-[#171a15]"
        >
          <ArrowLeft size={15} /> All bounties
        </Link>
        <section className="flex items-center gap-5 py-8 border-b border-line flex-wrap">
          <div className="inline-flex items-center justify-center w-[52px] h-[52px] rounded-full overflow-hidden border border-[#e6e9e3] bg-[#f8f9f7] text-[#3d4538] shrink-0">
            <CircleUserRound size={30} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] tracking-[0.02em] text-[#74776f]">
              Contributor profile
            </span>
            <h1 className="m-0 mt-1 text-[28px] font-semibold tracking-[-1.2px] text-[#171a15]">
              {hasActivity ? "KredoWork contributor" : "New contributor"}
            </h1>
            <p className="m-0 mt-1 text-xs text-muted font-mono">{wallet}</p>
          </div>
          {hasActivity && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-[#cfe3c5] bg-[#f0f5ec] text-[#4d8437] text-[11px] font-medium">
              <BadgeCheck size={15} /> On-chain activity
            </span>
          )}
        </section>
        {hasActivity ? (
          <>
            <div className="grid grid-cols-3 gap-4 py-8 border-b border-line max-[760px]:grid-cols-1">
              <article className="p-5 border border-line bg-white flex flex-col gap-1.5">
                <span className="text-[11px] text-muted">
                  Bounties completed
                </span>
                <strong className="text-[28px] font-semibold tracking-[-1px] text-[#171a15]">
                  {profile?.bounties_completed ?? 0}
                </strong>
                <small className="text-[11px] text-[#8a8e85]">
                  Recorded on this wallet&apos;s profile
                </small>
              </article>
              <article className="p-5 border border-line bg-white flex flex-col gap-1.5">
                <span className="text-[11px] text-muted">Earned</span>
                <strong className="text-[28px] font-semibold tracking-[-1px] text-[#171a15]">
                  {(Number(profile?.total_earned_lamports ?? 0) / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 3 })} <em className="not-italic text-sm text-[#548f3c]">SOL</em>
                </strong>
                <small className="text-[11px] text-[#8a8e85]">
                  Released from escrow
                </small>
              </article>
              <article className="p-5 border border-line bg-white flex flex-col gap-1.5">
                <span className="text-[11px] text-muted">
                  Reviews completed
                </span>
                <strong className="text-[28px] font-semibold tracking-[-1px] text-[#171a15]">
                  {profile?.reviews_completed ?? 0}
                </strong>
                <small className="text-[11px] text-[#8a8e85]">
                  Authorized reviewer activity
                </small>
              </article>
            </div>
            <section className="py-8 flex flex-col items-start gap-4">
              <div>
                <span className="text-[11px] tracking-[0.02em] text-[#74776f]">
                  Recent activity
                </span>
                <h2 className="m-0 mt-1 text-xl font-semibold tracking-[-0.5px] text-[#171a15]">
                  Work that speaks for itself
                </h2>
              </div>
              <p className="m-0 text-xs text-[#646a60] leading-relaxed max-w-[540px]">
                Counts reflect the reputation profile synchronized for this wallet.
              </p>
              <Link
                href="/bounties"
                className="inline-flex items-center gap-2 min-h-[42px] px-4 bg-[#171a15] text-white no-underline text-xs transition-colors duration-180 hover:bg-[#30372c]"
              >
                Explore open bounties <ArrowUpRight size={15} />
              </Link>
            </section>
          </>
        ) : (
          <section className="py-12 flex flex-col items-start gap-3">
            <span className="grid place-items-center w-11 h-11 bg-soft border border-line text-[#3d4538]">
              <CircleUserRound size={24} />
            </span>
            <h2 className="m-0 text-lg font-semibold text-[#171a15]">
              No reputation activity yet
            </h2>
            <p className="m-0 text-xs text-[#646a60] leading-relaxed max-w-[460px]">
              This wallet&apos;s profile will be initialized after its first
              bounty is completed or reviewed.
            </p>
            <Link
              href="/bounties"
              className="mt-2 inline-flex items-center gap-2 min-h-[42px] px-4 bg-[#171a15] text-white no-underline text-xs transition-colors duration-180 hover:bg-[#30372c]"
            >
              Explore open bounties <ArrowUpRight size={15} />
            </Link>
            <small className="text-[11px] text-[#8a8e85]">
              No reputation profile is recorded for this wallet yet.
            </small>
          </section>
        )}
      </div>
    </main>
  );
}
