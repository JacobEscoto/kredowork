"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  ExternalLink,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Brand from "@/components/brand";
import type { Bounty, BountyStatus } from "@/lib/bounties";

const stages: BountyStatus[] = [
  "OPEN",
  "CLAIMED",
  "SUBMITTED",
  "PRE_APPROVED",
  "COMPLETED",
];
const stageLabels: Record<BountyStatus, string> = {
  OPEN: "Open",
  CLAIMED: "Claimed",
  SUBMITTED: "Submitted",
  PRE_APPROVED: "Pre-approved",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
  DISPUTED: "Disputed",
  REJECTED: "Rejected",
};
type PreviewRole = "contributor" | "reviewer" | "public" | "sponsor";

const statusDotColors: Record<BountyStatus, string> = {
  OPEN: "bg-[#71bb53]",
  CLAIMED: "bg-[#d9ac4d]",
  SUBMITTED: "bg-[#7398cb]",
  PRE_APPROVED: "bg-[#9a78c9]",
  COMPLETED: "bg-[#69aa68]",
  EXPIRED: "bg-[#aaa]",
  DISPUTED: "bg-[#d77462]",
  REJECTED: "bg-[#a24132]",
};

function initialSeconds(bounty: Bounty) {
  if (bounty.status === "PRE_APPROVED") return 90;
  if (
    bounty.status === "EXPIRED" ||
    bounty.status === "COMPLETED" ||
    bounty.status === "REJECTED"
  )
    return 0;
  const match = bounty.deadline.match(/(?:(\d+)d)?\s*(?:(\d+)h)?/);
  const days = Number(match?.[1] ?? 0);
  const hours = Number(match?.[2] ?? 0);
  return Math.max(60, (days * 24 + hours) * 3600);
}

function formatCountdown(total: number) {
  const seconds = Math.max(0, total);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return days
    ? `${days}d ${hours}h ${minutes}m`
    : `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
}

export function BountyDetail({ bounty }: { bounty: Bounty }) {
  const [status, setStatus] = useState<BountyStatus>(bounty.status);
  const [role, setRole] = useState<PreviewRole>("contributor");
  const [secondsLeft, setSecondsLeft] = useState(() => initialSeconds(bounty));
  const [workUrl, setWorkUrl] = useState("");
  const [evidence, setEvidence] = useState("");
  const [deliveryHash, setDeliveryHash] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const timer = window.setInterval(
      () => setSecondsLeft((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const activeStage = stages.indexOf(status);
  const submitWork = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = JSON.stringify({
      bountyId: bounty.id,
      url: workUrl.trim(),
      evidence: evidence.trim(),
    });
    const bytes = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    setDeliveryHash(hash);
    setStatus("SUBMITTED");
    setSecondsLeft(24 * 60 * 60);
    setFeedback("Delivery hash created locally. No transaction was sent.");
  };
  const advance = (next: BountyStatus, message: string) => {
    setStatus(next);
    setSecondsLeft(next === "PRE_APPROVED" ? 90 : 0);
    setFeedback(message);
  };

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
          className="ml-auto inline-flex items-center gap-2 py-2 px-3.5 border border-[#191b16] bg-[#171a15] text-white no-underline text-xs transition-colors duration-200 hover:bg-[#353a30]"
          href="/profile/7xKp...mR4q"
        >
          <Wallet size={15} /> Demo profile
        </Link>
      </header>
      <div className="w-full max-w-[1040px] mx-auto py-10 flex-1">
        <Link
          href="/bounties"
          className="inline-flex items-center gap-2 text-[#71766e] no-underline text-xs hover:text-[#171a15]"
        >
          <ArrowLeft size={15} /> All bounties
        </Link>
        <div className="flex items-start justify-between gap-8 py-7 border-b border-line max-[760px]:flex-col">
          <div className="max-w-[640px]">
            <div className="flex items-center gap-3 text-xs font-mono text-muted mb-2.5">
              {bounty.id}
              <span className="inline-flex items-center gap-1.5 font-sans text-[11px] text-[#555a52]">
                <i
                  className={`w-1.5 h-1.5 rounded-full ${statusDotColors[status]}`}
                />
                {stageLabels[status]}
              </span>
            </div>
            <h1 className="m-0 text-[clamp(28px,4vw,40px)] font-semibold tracking-[-1.5px] leading-[1.1] text-[#171a15]">
              {bounty.title}
            </h1>
            <p className="mt-3 mb-0 text-sm text-[#646a60] leading-relaxed">
              {bounty.description}
            </p>
          </div>
          <div className="min-w-[210px] p-5 border border-line bg-soft flex flex-col gap-1 max-[760px]:w-full">
            <span className="text-[11px] text-muted">Reward in escrow</span>
            <strong className="text-[30px] font-semibold tracking-[-1px] text-[#171a15]">
              {bounty.amount}
              <small className="text-sm font-normal text-muted"> SOL</small>
            </strong>
            <em className="not-italic text-xs text-[#8a8e85]">
              ≈ $
              {(Number(bounty.amount) * 142.35).toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}{" "}
              USD
            </em>
          </div>
        </div>
        <section
          className="p-6 border border-line bg-white my-7"
          aria-labelledby="status-title"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <span className="text-[11px] tracking-[0.02em] text-[#74776f]">
                Bounty progress
              </span>
              <h2
                id="status-title"
                className="m-0 mt-1 text-lg font-semibold text-[#171a15]"
              >
                Status and timeline
              </h2>
            </div>
            <span className="inline-flex items-center gap-2 px-2.5 py-1 border border-line bg-soft text-[11px] text-[#555a52]">
              <i className="w-[7px] h-[7px] rounded-full bg-lime" /> Devnet
              preview
            </span>
          </div>
          <ol className="grid grid-cols-5 gap-3 list-none p-0 m-0 max-[760px]:grid-cols-1">
            {stages.map((step, index) => {
              const isComplete = index < activeStage;
              const isCurrent = index === activeStage;
              return (
                <li
                  key={step}
                  className={`flex items-center gap-2.5 p-3 border text-xs ${
                    isCurrent
                      ? "border-lime bg-[#f0f5ec] text-[#171a15] font-semibold"
                      : isComplete
                        ? "border-[#cfe3c5] bg-white text-[#4d8437]"
                        : "border-line bg-soft text-muted"
                  }`}
                >
                  <span
                    className={`grid place-items-center w-5 h-5 rounded-full border text-[10px] shrink-0 ${
                      isComplete || isCurrent
                        ? "border-lime bg-lime text-white"
                        : "border-[#d5d8d2] bg-white"
                    }`}
                  >
                    {isComplete ? <Check size={13} /> : null}
                  </span>
                  <span>{stageLabels[step]}</span>
                </li>
              );
            })}
          </ol>
          {(status === "OPEN" ||
            status === "CLAIMED" ||
            status === "SUBMITTED" ||
            status === "PRE_APPROVED") && (
            <div className="flex items-center gap-2.5 mt-5 pt-4 border-t border-line text-xs text-[#555a52]">
              <Clock3 size={16} className="text-[#528d3a]" />
              <span>
                {status === "PRE_APPROVED"
                  ? "Optimistic review window"
                  : status === "OPEN"
                    ? "Time to claim"
                    : status === "CLAIMED"
                      ? "Time to submit"
                      : "Review window"}
              </span>
              <strong className="font-mono text-[#171a15]" aria-live="polite">
                {formatCountdown(secondsLeft)}
              </strong>
              <span className="text-muted">remaining</span>
            </div>
          )}
          {(status === "REJECTED" ||
            status === "DISPUTED" ||
            status === "EXPIRED") && (
            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-line text-xs text-[#555a52]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#171a15]">
                <i
                  className={`w-1.5 h-1.5 rounded-full ${statusDotColors[status]}`}
                />
                {stageLabels[status]}
              </span>
              <span>
                {status === "EXPIRED"
                  ? "The submission deadline has passed."
                  : status === "REJECTED"
                    ? "The reviewer declined this delivery."
                    : "A resolution is in progress."}
              </span>
            </div>
          )}
        </section>
        <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)] gap-6 items-start max-[900px]:grid-cols-1">
          <section
            className="p-6 border border-line bg-white"
            aria-labelledby="action-title"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <span className="text-[11px] tracking-[0.02em] text-[#74776f]">
                  Next step
                </span>
                <h2
                  id="action-title"
                  className="m-0 mt-1 text-lg font-semibold text-[#171a15]"
                >
                  Bounty actions
                </h2>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted">
                Preview role
                <select
                  className="px-2.5 py-1.5 border border-line bg-white text-foreground text-xs"
                  aria-label="Preview role"
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as PreviewRole)
                  }
                >
                  <option value="contributor">Contributor</option>
                  <option value="reviewer">Authorized reviewer</option>
                  <option value="public">Any wallet</option>
                  <option value="sponsor">Sponsor</option>
                </select>
              </label>
            </div>
            <p className="flex items-center gap-2 p-3 mb-5 border border-[#e4c5a3] bg-[#fffaf4] text-[#59442f] text-[11px]">
              <Wallet size={14} /> Role preview only. Connect a wallet and
              on-chain program to authorize real actions.
            </p>
            {(status === "OPEN" || status === "REJECTED") && role === "contributor" && (
              <form
                className="flex flex-col gap-4 items-start"
                onSubmit={submitWork}
              >
                <h3 className="m-0 text-sm font-semibold text-[#171a15]">
                  Submit your work
                </h3>
                <p className="m-0 text-xs text-[#646a60]">
                  Share a public link and a short note about what you completed.
                </p>
                <label className="w-full flex flex-col gap-1.5 text-xs text-[#3d4439]">
                  Work link
                  <input
                    className="w-full px-3 py-2 border border-line bg-white text-foreground text-xs"
                    required
                    type="url"
                    value={workUrl}
                    onChange={(event) => setWorkUrl(event.target.value)}
                    placeholder="https://github.com/..."
                  />
                </label>
                <label className="w-full flex flex-col gap-1.5 text-xs text-[#3d4439]">
                  Evidence or notes
                  <textarea
                    className="w-full px-3 py-2 border border-line bg-white text-foreground text-xs"
                    required
                    rows={3}
                    value={evidence}
                    onChange={(event) => setEvidence(event.target.value)}
                    placeholder="Summarize the changes and how to verify them"
                  />
                </label>
                <button
                  className="inline-flex items-center gap-2 min-h-[42px] px-4 bg-[#171a15] text-white border-0 text-xs cursor-pointer hover:bg-[#30372c]"
                  type="submit"
                >
                  Submit work directly <ArrowRight size={15} />
                </button>
              </form>
            )}
            {status === "SUBMITTED" && role === "reviewer" && (
              <div className="flex flex-col items-start gap-3">
                <h3 className="m-0 text-sm font-semibold text-[#171a15]">
                  Review the delivery
                </h3>
                <p className="m-0 text-xs text-[#646a60]">
                  Check the submitted evidence before deciding. Approval opens
                  the optimistic review window.
                </p>
                {deliveryHash && (
                  <div className="w-full p-3 bg-soft border border-line flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted">
                      Delivery hash
                    </span>
                    <code className="text-[11px] font-mono break-all">
                      {deliveryHash}
                    </code>
                  </div>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    className="inline-flex items-center gap-2 min-h-[42px] px-4 bg-[#171a15] text-white border-0 text-xs cursor-pointer hover:bg-[#30372c]"
                    onClick={() =>
                      advance(
                        "PRE_APPROVED",
                        "Pre-approval recorded in this preview. No transaction was sent.",
                      )
                    }
                  >
                    Approve delivery
                  </button>
                  <button
                    className="inline-flex items-center gap-2 min-h-[42px] px-4 bg-white text-[#a24132] border border-[#e3b9b2] text-xs cursor-pointer hover:bg-[#fdf4f2]"
                    onClick={() =>
                      advance(
                        "REJECTED",
                        "Rejection recorded in this preview. No transaction was sent.",
                      )
                    }
                  >
                    Reject delivery
                  </button>
                </div>
              </div>
            )}
            {status === "PRE_APPROVED" && secondsLeft === 0 && (
              <div className="flex flex-col items-start gap-3">
                <h3 className="m-0 text-sm font-semibold text-[#171a15]">
                  Review window complete
                </h3>
                <p className="m-0 text-xs text-[#646a60]">
                  Anyone can finalize the bounty and release payment after the
                  optimistic window ends.
                </p>
                <button
                  className="inline-flex items-center gap-2 min-h-[42px] px-4 bg-[#171a15] text-white border-0 text-xs cursor-pointer hover:bg-[#30372c]"
                  onClick={() =>
                    advance(
                      "COMPLETED",
                      "Finalization recorded in this preview. No transaction was sent.",
                    )
                  }
                >
                  Finalize and release payment <ArrowRight size={15} />
                </button>
              </div>
            )}
            {status === "EXPIRED" && role === "sponsor" && (
              <div className="flex flex-col items-start gap-3">
                <h3 className="m-0 text-sm font-semibold text-[#171a15]">
                  No work was submitted
                </h3>
                <p className="m-0 text-xs text-[#646a60]">
                  As the sponsor, you can reclaim funds after the bounty
                  deadline expires.
                </p>
                <button
                  className="inline-flex items-center gap-2 min-h-[42px] px-4 bg-[#171a15] text-white border-0 text-xs cursor-pointer hover:bg-[#30372c]"
                  onClick={() =>
                    advance(
                      "COMPLETED",
                      "Expired funds reclaimed in this preview. No transaction was sent.",
                    )
                  }
                >
                  Reclaim expired funds <ArrowRight size={15} />
                </button>
              </div>
            )}
            {status === "COMPLETED" && (
              <div className="flex items-center gap-3 p-4 bg-[#f0f5ec] border border-[#cfe3c5]">
                <span className="grid place-items-center w-8 h-8 rounded-full bg-lime text-white shrink-0">
                  <Check size={18} />
                </span>
                <div>
                  <h3 className="m-0 text-sm font-semibold text-[#171a15]">
                    Bounty completed
                  </h3>
                  <p className="m-0 mt-0.5 text-xs text-[#4d8437]">
                    The preview shows the bounty as settled.
                  </p>
                </div>
              </div>
            )}
            {!(
              (status === "OPEN" && role === "contributor") ||
              (status === "CLAIMED" && role === "contributor") ||
              (status === "SUBMITTED" && role === "reviewer") ||
              (status === "PRE_APPROVED" && secondsLeft === 0) ||
              (status === "EXPIRED" && role === "sponsor") ||
              status === "COMPLETED"
            ) && (
              <div className="flex flex-col items-start gap-1.5 p-4 bg-soft border border-line text-xs text-muted">
                <ShieldCheck size={19} className="text-[#528d3a]" />
                <p className="m-0 font-medium text-[#171a15]">
                  No action is available for this role and status.
                </p>
                <span>
                  Choose another preview role to inspect its permissions.
                </span>
              </div>
            )}
            {feedback && (
              <p
                className="mt-4 mb-0 p-3 bg-[#f0f5ec] border border-[#cfe3c5] text-[#3f7331] text-xs"
                role="status"
              >
                {feedback}
              </p>
            )}
          </section>
          {((status === "PRE_APPROVED" && secondsLeft > 0) ||
            status === "REJECTED") && (
            <section
              className="p-6 border border-line bg-white flex flex-col gap-4"
              aria-labelledby="dispute-title"
            >
              <div className="grid place-items-center w-9 h-9 bg-[#f0f5ec] text-[#528d3a]">
                <ShieldCheck size={17} />
              </div>
              <div>
                <span className="text-[11px] tracking-[0.02em] text-[#74776f]">
                  Resolution area
                </span>
                <h2
                  id="dispute-title"
                  className="m-0 mt-1 text-lg font-semibold text-[#171a15]"
                >
                  Disputes
                </h2>
                <p className="mt-2 mb-3 text-xs text-[#646a60]">
                  {status === "REJECTED"
                    ? "A dispute can be opened after a rejected delivery."
                    : "The optimistic review window is still active."}
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-3.5 py-2 border border-line bg-soft text-muted text-xs cursor-not-allowed"
                  disabled
                >
                  Open a dispute{" "}
                  <span className="text-[10px] uppercase">Coming soon</span>
                </button>
              </div>
              <div className="pt-4 border-t border-line grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-[10px] text-muted">
                    Arbitration bond
                  </span>
                  <strong>—</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-muted">
                    Arbitrator votes
                  </span>
                  <strong>—</strong>
                </div>
                <small className="col-span-full text-[11px] text-[#8a8e85]">
                  Dispute tools will appear here when arbitration is available.
                </small>
              </div>
            </section>
          )}
          <aside className="p-6 border border-line bg-white">
            <h2 className="m-0 mb-4 text-base font-semibold text-[#171a15]">
              Details
            </h2>
            <dl className="m-0 divide-y divide-line text-xs">
              <div className="py-2.5 flex justify-between gap-3">
                <dt className="text-muted">Category</dt>
                <dd className="m-0 font-medium text-[#171a15]">
                  {bounty.category}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-3">
                <dt className="text-muted">Approval method</dt>
                <dd className="m-0 font-medium text-[#171a15]">
                  {bounty.approval}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-3">
                <dt className="text-muted">Posted</dt>
                <dd className="m-0 font-medium text-[#171a15]">
                  {bounty.posted}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-3">
                <dt className="text-muted">Specification hash</dt>
                <dd className="m-0 font-mono text-[#171a15]">
                  <code>{bounty.hash}</code>
                </dd>
              </div>
            </dl>
            <Link
              href="/profile/7xKp...mR4q"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#3f7331] no-underline font-semibold hover:underline"
            >
              View demo reputation <ExternalLink size={13} />
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
