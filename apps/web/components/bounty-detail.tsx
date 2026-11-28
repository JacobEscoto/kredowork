"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  CircleCheck,
  CircleDot,
  CircleX,
  Clock3,
  Coins,
  Copy,
  ExternalLink,
  FileText,
  FileUp,
  HandCoins,
  Layers,
  Scale,
  Send,
  ShieldCheck,
  Undo2,
  UserCheck,
  Wallet,
  type LucideIcon,
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
const stageIcons: Partial<Record<BountyStatus, LucideIcon>> = {
  OPEN: CircleDot,
  CLAIMED: UserCheck,
  SUBMITTED: FileUp,
  PRE_APPROVED: ShieldCheck,
  COMPLETED: CircleCheck,
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
const statusPill: Record<BountyStatus, string> = {
  OPEN: "bg-[#eef8e9] text-[#3f6f2a]",
  CLAIMED: "bg-[#fbf3e0] text-[#8a6218]",
  SUBMITTED: "bg-[#e9f0f9] text-[#3d628f]",
  PRE_APPROVED: "bg-[#f1ebf8] text-[#6c4a9a]",
  COMPLETED: "bg-[#e8f3e8] text-[#3b7339]",
  EXPIRED: "bg-[#f1f1ef] text-[#6b7066]",
  DISPUTED: "bg-[#fbece9] text-[#a24132]",
  REJECTED: "bg-[#f8e3df] text-[#8c2f22]",
};

// Botones: jerarquía oscuro / lime / outline / peligro
const BTN =
  "inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md px-5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto";
const BTN_PRIMARY = `${BTN} border-0 bg-[#171a15] font-medium text-white hover:bg-[#30372c] focus-visible:outline-[#171a15]`;
const BTN_ACCENT = `${BTN} border-0 bg-lime font-semibold text-[#171a15] hover:brightness-95 focus-visible:outline-[#171a15]`;
const BTN_DANGER = `${BTN} border border-[#d9a69c] bg-white font-medium text-[#a24132] hover:bg-[#fdf3f1] focus-visible:outline-[#a24132]`;

const CARD = "border border-[#e6e9e3] bg-white p-4 sm:p-6";
const INPUT =
  "w-full rounded-md border border-[#cfd5c9] bg-white px-3 text-base text-[#171a15] placeholder:text-[#9aa095] focus:border-[#171a15] focus:outline-none focus:ring-2 focus:ring-lime/40 sm:text-sm";

// Conector entre pasos: vertical en móvil, horizontal desde md.
// Cada paso dibuja el suyo hacia el siguiente; el último no lleva.
const CONNECTOR =
  "after:absolute after:content-[''] after:left-4.5 after:top-11 after:bottom-2 after:w-px " +
  "md:after:left-12 md:after:right-2 md:after:top-4.5 md:after:bottom-auto md:after:h-px md:after:w-auto";

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

function StatusBadge({ status }: { status: BountyStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPill[status]}`}
    >
      <i
        aria-hidden="true"
        className={`size-1.5 rounded-full ${statusDotColors[status]}`}
      />
      {stageLabels[status]}
    </span>
  );
}

export function BountyDetail({ bounty }: { bounty: Bounty }) {
  const [status, setStatus] = useState<BountyStatus>(bounty.status);
  const [role, setRole] = useState<PreviewRole>("contributor");
  const [secondsLeft, setSecondsLeft] = useState(() => initialSeconds(bounty));
  const [workUrl, setWorkUrl] = useState("");
  const [evidence, setEvidence] = useState("");
  const [deliveryHash, setDeliveryHash] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hashCopied, setHashCopied] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(
      () => setSecondsLeft((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const activeStage = stages.indexOf(status);
  const usd = (Number(bounty.amount.replace(/,/g, "")) * 142.35).toLocaleString(
    "en-US",
    { maximumFractionDigits: 0 },
  );

  const submitWork = async (event: React.ChangeEvent<HTMLFormElement>) => {
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

  async function copySpecHash() {
    try {
      await navigator.clipboard.writeText(bounty.hash);
      setHashCopied(true);
      window.setTimeout(() => setHashCopied(false), 1600);
    } catch {
      setHashCopied(false);
    }
  }

  const facts: {
    icon: LucideIcon;
    label: string;
    value: string;
    hint?: string;
    strong?: boolean;
  }[] = [
    {
      icon: Coins,
      label: "Reward in escrow",
      value: `${bounty.amount} SOL`,
      hint: `≈ $${usd} USD`,
      strong: true,
    },
    { icon: Clock3, label: "Time left", value: bounty.deadline },
    { icon: ShieldCheck, label: "Approval", value: bounty.approval },
    { icon: Layers, label: "Space", value: bounty.category },
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-360 flex-col px-4 sm:px-6 md:px-8 lg:px-[6.25%]">
      {/* Header */}
      <header className="flex h-16 items-center gap-6 border-b border-line lg:h-19.5 lg:gap-14">
        <Brand />
        <nav
          className="hidden items-center gap-6 md:flex lg:gap-8"
          aria-label="Main navigation"
        >
          <Link
            href="/bounties"
            className="text-sm text-[#5f645b] no-underline transition-colors hover:text-[#161812]"
          >
            Explore
          </Link>
          <Link
            href="/workspaces/new"
            className="text-sm text-[#5f645b] no-underline transition-colors hover:text-[#161812]"
          >
            Create a workspace
          </Link>
        </nav>
        <Link
          href="/profile/7xKp...mR4q"
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md border border-[#cfd5c9] bg-white px-3.5 text-xs font-medium text-[#171a15] no-underline transition-colors hover:border-[#171a15] hover:bg-[#f1f3ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
        >
          <Wallet size={16} aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Demo profile</span>
        </Link>
      </header>

      <div className="mx-auto w-full max-w-260 flex-1 py-6 sm:py-10">
        <Link
          href="/bounties"
          className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded px-1 text-xs text-[#5f645b] no-underline transition-colors hover:text-[#171a15] focus-visible:outline-2 focus-visible:outline-lime"
        >
          <ArrowLeft size={16} aria-hidden="true" /> All bounties
        </Link>

        {/* Título */}
        <div className="pb-6 pt-3 sm:pt-5">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusBadge status={status} />
            <span className="font-mono text-xs text-[#6b7066]">
              {bounty.id}
            </span>
          </div>
          <h1 className="m-0 max-w-170 text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.045em] text-[#171a15]">
            {bounty.title}
          </h1>
          <p className="mb-0 mt-3 max-w-155 text-sm leading-7 text-[#5f645b] sm:text-[15px]">
            {bounty.description}
          </p>
        </div>

        {/* Datos clave (lista, no tarjetas) */}
        <dl className="m-0 grid grid-cols-1 divide-y divide-line border-y border-line sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0 lg:grid-cols-4 lg:gap-x-0 lg:divide-x">
          {facts.map(({ icon: Icon, label, value, hint, strong }) => (
            <div
              key={label}
              className="flex items-start gap-3 py-4 lg:px-5 lg:first:pl-0"
            >
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-md bg-[#eaf3e4] text-[#3f7a2a]"
              >
                <Icon size={17} />
              </span>
              <div className="min-w-0">
                <dt className="text-xs text-[#6b7066]">{label}</dt>
                <dd
                  className={`m-0 mt-0.5 wrap-break-word text-[#171a15] ${
                    strong
                      ? "text-lg font-semibold tracking-[-0.02em]"
                      : "text-sm font-medium"
                  }`}
                >
                  {value}
                </dd>
                {hint && <dd className="m-0 text-xs text-[#6b7066]">{hint}</dd>}
              </div>
            </div>
          ))}
        </dl>

        {/* Progreso */}
        <section
          className={`${CARD} my-6 sm:my-7`}
          aria-labelledby="status-title"
        >
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-xs text-[#6b7066]">Bounty progress</span>
              <h2
                id="status-title"
                className="m-0 mt-1 text-lg font-semibold text-[#171a15]"
              >
                Status and timeline
              </h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-soft px-2.5 py-1 text-xs text-[#555a52]">
              <i
                aria-hidden="true"
                className="size-1.75 rounded-full bg-lime"
              />
              Devnet preview
            </span>
          </div>

          <ol className="m-0 grid list-none grid-cols-1 p-0 md:grid-cols-5">
            {stages.map((step, index) => {
              const isComplete = index < activeStage;
              const isCurrent = index === activeStage;
              const isLast = index === stages.length - 1;
              const Icon = stageIcons[step] ?? CircleDot;
              return (
                <li
                  key={step}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`relative grid grid-cols-[36px_minmax(0,1fr)] items-start gap-x-3 pb-6 last:pb-0 md:flex md:flex-col md:gap-0 md:pb-0 md:pr-3 ${
                    isLast
                      ? ""
                      : `${CONNECTOR} ${isComplete ? "after:bg-lime" : "after:bg-[#d3dacd]"}`
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-9 shrink-0 place-items-center rounded-full border ${
                      isComplete
                        ? "border-lime bg-lime text-[#171a15]"
                        : isCurrent
                          ? "border-lime bg-[#eef8e9] text-[#3f6f2a] ring-4 ring-lime/20"
                          : "border-[#d5d8d2] bg-white text-[#9aa095]"
                    }`}
                  >
                    {isComplete ? <Check size={17} /> : <Icon size={16} />}
                  </span>
                  <span
                    className={`pt-2 text-[13px] md:pt-3 ${
                      isCurrent
                        ? "font-semibold text-[#171a15]"
                        : isComplete
                          ? "text-[#3f6f2a]"
                          : "text-[#6b7066]"
                    }`}
                  >
                    {stageLabels[step]}
                  </span>
                </li>
              );
            })}
          </ol>

          {(status === "OPEN" ||
            status === "CLAIMED" ||
            status === "SUBMITTED" ||
            status === "PRE_APPROVED") && (
            <div className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-line pt-4 text-[13px] text-[#555a52]">
              <Clock3 size={16} aria-hidden="true" className="text-[#3f7a2a]" />
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
              <span className="text-[#6b7066]">remaining</span>
            </div>
          )}

          {(status === "REJECTED" ||
            status === "DISPUTED" ||
            status === "EXPIRED") && (
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4 text-[13px] text-[#555a52]">
              <StatusBadge status={status} />
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

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            {/* Acciones */}
            <section className={CARD} aria-labelledby="action-title">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="text-xs text-[#6b7066]">Next step</span>
                  <h2
                    id="action-title"
                    className="m-0 mt-1 text-lg font-semibold text-[#171a15]"
                  >
                    Bounty actions
                  </h2>
                </div>
                <label className="flex flex-col gap-1.5 text-xs text-[#6b7066] sm:items-end">
                  Preview role
                  <select
                    className="h-11 w-full rounded-md border border-[#cfd5c9] bg-white px-3 text-base text-[#171a15] focus:border-[#171a15] focus:outline-none focus:ring-2 focus:ring-lime/40 sm:w-auto sm:text-sm"
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

              <p className="mb-5 flex items-start gap-2 border border-[#e4c5a3] bg-[#fffaf4] p-3 text-xs leading-normal text-[#59442f]">
                <Wallet
                  size={15}
                  aria-hidden="true"
                  className="mt-px shrink-0"
                />
                Role preview only. Connect a wallet and on-chain program to
                authorize real actions.
              </p>

              {(status === "OPEN" || status === "REJECTED") &&
                role === "contributor" && (
                  <form
                    className="flex flex-col items-stretch gap-4 sm:items-start"
                    onSubmit={submitWork}
                  >
                    <div>
                      <h3 className="m-0 text-sm font-semibold text-[#171a15]">
                        Submit your work
                      </h3>
                      <p className="m-0 mt-1 text-[13px] leading-6 text-[#5f645b]">
                        Share a public link and a short note about what you
                        completed.
                      </p>
                    </div>
                    <label className="flex w-full flex-col gap-1.5 text-xs font-medium text-[#3d4439]">
                      Work link
                      <input
                        className={`${INPUT} h-11`}
                        required
                        type="url"
                        value={workUrl}
                        onChange={(event) => setWorkUrl(event.target.value)}
                        placeholder="https://github.com/..."
                      />
                    </label>
                    <label className="flex w-full flex-col gap-1.5 text-xs font-medium text-[#3d4439]">
                      Evidence or notes
                      <textarea
                        className={`${INPUT} resize-y py-2.5`}
                        required
                        rows={4}
                        value={evidence}
                        onChange={(event) => setEvidence(event.target.value)}
                        placeholder="Summarize the changes and how to verify them"
                      />
                    </label>
                    <button className={BTN_PRIMARY} type="submit">
                      <Send size={16} aria-hidden="true" />
                      Submit work directly
                    </button>
                  </form>
                )}

              {status === "SUBMITTED" && role === "reviewer" && (
                <div className="flex flex-col items-stretch gap-3 sm:items-start">
                  <h3 className="m-0 text-sm font-semibold text-[#171a15]">
                    Review the delivery
                  </h3>
                  <p className="m-0 text-[13px] leading-6 text-[#5f645b]">
                    Check the submitted evidence before deciding. Approval opens
                    the optimistic review window.
                  </p>
                  {deliveryHash && (
                    <div className="flex w-full flex-col gap-1 border border-line bg-soft p-3">
                      <span className="text-xs text-[#6b7066]">
                        Delivery hash
                      </span>
                      <code className="break-all font-mono text-xs text-[#171a15]">
                        {deliveryHash}
                      </code>
                    </div>
                  )}
                  <div className="flex w-full flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      className={BTN_PRIMARY}
                      onClick={() =>
                        advance(
                          "PRE_APPROVED",
                          "Pre-approval recorded in this preview. No transaction was sent.",
                        )
                      }
                    >
                      <Check size={16} aria-hidden="true" />
                      Approve delivery
                    </button>
                    <button
                      type="button"
                      className={BTN_DANGER}
                      onClick={() =>
                        advance(
                          "REJECTED",
                          "Rejection recorded in this preview. No transaction was sent.",
                        )
                      }
                    >
                      <CircleX size={16} aria-hidden="true" />
                      Reject delivery
                    </button>
                  </div>
                </div>
              )}

              {status === "PRE_APPROVED" && secondsLeft === 0 && (
                <div className="flex flex-col items-stretch gap-3 sm:items-start">
                  <h3 className="m-0 text-sm font-semibold text-[#171a15]">
                    Review window complete
                  </h3>
                  <p className="m-0 text-[13px] leading-6 text-[#5f645b]">
                    Anyone can finalize the bounty and release payment after the
                    optimistic window ends.
                  </p>
                  <button
                    type="button"
                    className={BTN_ACCENT}
                    onClick={() =>
                      advance(
                        "COMPLETED",
                        "Finalization recorded in this preview. No transaction was sent.",
                      )
                    }
                  >
                    <HandCoins size={16} aria-hidden="true" />
                    Finalize and release payment
                  </button>
                </div>
              )}

              {status === "EXPIRED" && role === "sponsor" && (
                <div className="flex flex-col items-stretch gap-3 sm:items-start">
                  <h3 className="m-0 text-sm font-semibold text-[#171a15]">
                    No work was submitted
                  </h3>
                  <p className="m-0 text-[13px] leading-6 text-[#5f645b]">
                    As the sponsor, you can reclaim funds after the bounty
                    deadline expires.
                  </p>
                  <button
                    type="button"
                    className={BTN_PRIMARY}
                    onClick={() =>
                      advance(
                        "COMPLETED",
                        "Expired funds reclaimed in this preview. No transaction was sent.",
                      )
                    }
                  >
                    <Undo2 size={16} aria-hidden="true" />
                    Reclaim expired funds
                  </button>
                </div>
              )}

              {status === "COMPLETED" && (
                <div className="flex items-center gap-3 border border-[#cfe3c5] bg-[#f0f5ec] p-4">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-lime text-[#171a15]"
                  >
                    <Check size={18} />
                  </span>
                  <div>
                    <h3 className="m-0 text-sm font-semibold text-[#171a15]">
                      Bounty completed
                    </h3>
                    <p className="m-0 mt-0.5 text-xs text-[#3f6f2a]">
                      The preview shows the bounty as settled.
                    </p>
                  </div>
                </div>
              )}

              {!(
                ((status === "OPEN" || status === "REJECTED") &&
                  role === "contributor") ||
                (status === "SUBMITTED" && role === "reviewer") ||
                (status === "PRE_APPROVED" && secondsLeft === 0) ||
                (status === "EXPIRED" && role === "sponsor") ||
                status === "COMPLETED"
              ) && (
                <div className="flex flex-col items-start gap-1.5 border border-line bg-soft p-4 text-xs text-[#6b7066]">
                  <ShieldCheck
                    size={20}
                    aria-hidden="true"
                    className="text-[#3f7a2a]"
                  />
                  <p className="m-0 text-[13px] font-medium text-[#171a15]">
                    No action is available for this role and status.
                  </p>
                  <span>
                    Choose another preview role to inspect its permissions.
                  </span>
                </div>
              )}

              {feedback && (
                <p
                  role="status"
                  className="mb-0 mt-4 border border-[#cfe3c5] bg-[#f0f5ec] p-3 text-xs leading-normal text-[#3f6f2a]"
                >
                  {feedback}
                </p>
              )}
            </section>

            {/* Disputas */}
            {((status === "PRE_APPROVED" && secondsLeft > 0) ||
              status === "REJECTED") && (
              <section
                className={`${CARD} flex flex-col gap-4`}
                aria-labelledby="dispute-title"
              >
                <div
                  aria-hidden="true"
                  className="grid size-9 place-items-center rounded-md bg-[#eaf3e4] text-[#3f7a2a]"
                >
                  <Scale size={17} />
                </div>
                <div>
                  <span className="text-xs text-[#6b7066]">
                    Resolution area
                  </span>
                  <h2
                    id="dispute-title"
                    className="m-0 mt-1 text-lg font-semibold text-[#171a15]"
                  >
                    Disputes
                  </h2>
                  <p className="mb-3 mt-2 text-[13px] leading-6 text-[#5f645b]">
                    {status === "REJECTED"
                      ? "A dispute can be opened after a rejected delivery."
                      : "The optimistic review window is still active."}
                  </p>
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-line bg-soft px-4 text-xs text-[#6b7066] sm:w-auto"
                  >
                    Open a dispute
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium">
                      Coming soon
                    </span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
                  <div>
                    <span className="block text-[#6b7066]">
                      Arbitration bond
                    </span>
                    <strong>—</strong>
                  </div>
                  <div>
                    <span className="block text-[#6b7066]">
                      Arbitrator votes
                    </span>
                    <strong>—</strong>
                  </div>
                  <small className="col-span-full text-xs text-[#6b7066]">
                    Dispute tools will appear here when arbitration is
                    available.
                  </small>
                </div>
              </section>
            )}
          </div>

          {/* Especificación */}
          <aside className={CARD}>
            <h2 className="m-0 mb-4 flex items-center gap-2 text-base font-semibold text-[#171a15]">
              <FileText
                size={17}
                aria-hidden="true"
                className="text-[#3f7a2a]"
              />
              Specification
            </h2>
            <dl className="m-0 divide-y divide-line text-[13px]">
              <div className="flex items-start justify-between gap-4 py-3">
                <dt className="shrink-0 text-[#6b7066]">Due date</dt>
                <dd className="m-0 min-w-0 wrap-break-word text-right font-medium text-[#171a15]">
                  {bounty.posted}
                </dd>
              </div>
              <div className="flex flex-col gap-2 py-3">
                <dt className="text-[#6b7066]">Specification hash</dt>
                <dd className="m-0 flex items-start gap-2">
                  <code className="min-w-0 flex-1 break-all font-mono text-xs text-[#171a15]">
                    {bounty.hash}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copySpecHash()}
                    aria-label="Copy specification hash"
                    className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md border border-[#cfd5c9] bg-white text-[#41463d] transition-colors hover:border-[#171a15] hover:bg-[#f1f3ee] focus-visible:outline-2 focus-visible:outline-lime"
                  >
                    {hashCopied ? (
                      <Check size={15} aria-hidden="true" />
                    ) : (
                      <Copy size={15} aria-hidden="true" />
                    )}
                  </button>
                </dd>
              </div>
            </dl>
            <Link
              href="/profile/7xKp...mR4q"
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-[#2f5d1c] underline-offset-4 hover:underline"
            >
              View demo reputation
              <ExternalLink size={13} aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
