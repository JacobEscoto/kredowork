"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Brand from "@/components/brand";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Hash,
  ShieldCheck,
  Wallet,
} from "lucide-react";

async function createSpecHash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function NewBountyForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState("");
  const [workspace, setWorkspace] = useState("Core Infrastructure");
  const [reward, setReward] = useState("");
  const [deadline, setDeadline] = useState("");
  const [specHash, setSpecHash] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walletMessage, setWalletMessage] = useState(false);

  useEffect(() => {
    let current = true;
    const specification = JSON.stringify({
      title: title.trim(),
      description: description.trim(),
      criteria: criteria.trim(),
    });
    if (!title.trim() && !description.trim() && !criteria.trim()) {
      setSpecHash("");
      return () => {
        current = false;
      };
    }
    createSpecHash(specification).then((hash) => {
      if (current) setSpecHash(hash);
    });
    return () => {
      current = false;
    };
  }, [title, description, criteria]);

  const copyHash = async () => {
    if (!specHash) return;
    await navigator.clipboard?.writeText(specHash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  const formatDeadline = () =>
    deadline
      ? new Date(`${deadline}T12:00:00`).toLocaleDateString("en", {
          dateStyle: "medium",
        })
      : "Sin definir";

  return (
    <main className="min-h-screen max-w-[1440px] mx-auto px-[6.25%] flex flex-col max-[1050px]:px-[4%] max-[760px]:px-[22px] max-[460px]:px-[17px]">
      <header className="h-[78px] flex items-center justify-between border-b border-line max-[760px]:h-[66px]">
        <Brand />
        <Link
          className="inline-flex items-center gap-2 text-[#71766e] no-underline text-[11px] hover:text-[#171a15]"
          href="/bounties"
        >
          <ArrowLeft size={15} /> Back to bounties
        </Link>
      </header>
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] gap-14 py-12 flex-1 items-start max-[900px]:grid-cols-1 max-[900px]:gap-10">
        <section className="max-w-[620px]" aria-labelledby="bounty-create-title">
          <div className="flex items-center gap-3 text-[11px] text-[#697063] mb-5">
            <span className="font-semibold text-[#171a15]">01</span>
            <span className="w-6 h-px bg-lime" />
            <span>POST A BOUNTY</span>
          </div>
          <h1
            id="bounty-create-title"
            className="m-0 text-[clamp(40px,5vw,60px)] leading-none tracking-[-3px] font-semibold text-[#171a15] [&_span]:text-lime"
          >
            Clear work.
            <br />
            Real impact<span>.</span>
          </h1>
          <p className="mt-4 mb-8 text-sm text-[#646a60] leading-relaxed max-w-[460px]">
            Define the task, how it will be verified, and the reward held in
            escrow.
          </p>
          {!showReview ? (
            <form
              className="flex flex-col gap-5"
              onSubmit={async (event) => {
                event.preventDefault();
                const finalHash = await createSpecHash(
                  JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    criteria: criteria.trim(),
                  }),
                );
                setSpecHash(finalHash);
                setShowReview(true);
                setWalletMessage(false);
              }}
            >
              <div className="flex items-center gap-2.5 pt-2 border-t border-line">
                <span className="text-[11px] font-semibold text-[#528d3a]">
                  01
                </span>
                <h2 className="m-0 text-sm font-semibold text-[#171a15]">
                  Define the work
                </h2>
              </div>
              <label className="flex flex-col gap-1.5 text-xs text-[#3d4439]">
                <span className="flex items-center justify-between">
                  Task title{" "}
                  <b className="font-normal text-[10px] text-[#8a8e85]">
                    Required
                  </b>
                </span>
                <input
                  className="w-full px-3 py-2.5 border border-line bg-white text-foreground text-xs focus:outline-2 focus:outline-lime focus:outline-offset-1"
                  required
                  maxLength={90}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Add RPC availability alerts"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-[#3d4439]">
                <span>Workspace</span>
                <select
                  className="w-full px-3 py-2.5 border border-line bg-white text-foreground text-xs focus:outline-2 focus:outline-lime focus:outline-offset-1"
                  value={workspace}
                  onChange={(event) => setWorkspace(event.target.value)}
                >
                  <option>Core Infrastructure</option>
                  <option>Validator Collective</option>
                  <option>RPC Network</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-[#3d4439]">
                <span className="flex items-center justify-between">
                  Summary{" "}
                  <b className="font-normal text-[10px] text-[#8a8e85]">
                    Required
                  </b>
                </span>
                <textarea
                  className="w-full px-3 py-2.5 border border-line bg-white text-foreground text-xs focus:outline-2 focus:outline-lime focus:outline-offset-1"
                  required
                  rows={3}
                  maxLength={600}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Task context and scope"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-[#3d4439]">
                <span className="flex items-center justify-between">
                  Acceptance criteria{" "}
                  <b className="font-normal text-[10px] text-[#8a8e85]">
                    Required
                  </b>
                </span>
                <textarea
                  className="w-full px-3 py-2.5 border border-line bg-white text-foreground text-xs focus:outline-2 focus:outline-lime focus:outline-offset-1"
                  required
                  rows={5}
                  maxLength={3000}
                  value={criteria}
                  onChange={(event) => setCriteria(event.target.value)}
                  placeholder={
                    "Describe how the result will be checked\nOne criterion per line"
                  }
                />
                <small className="text-[11px] text-[#8a8e85]">
                  These criteria are used to create a SHA-256 fingerprint of the
                  specification.
                </small>
              </label>
              <div className="p-4 border border-line bg-soft flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] tracking-wider text-muted">
                  <Hash size={15} className="text-[#528d3a]" />
                  <span>SPECIFICATION SHA-256 HASH</span>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[#528d3a]">
                    <i className="w-1.5 h-1.5 rounded-full bg-lime" />{" "}
                    Calculated on this device
                  </span>
                </div>
                <code className="font-mono text-[11px] text-[#171a15] break-all">
                  {specHash ||
                    "Add a title, summary, and criteria to calculate the hash"}
                </code>
              </div>
              <div className="flex items-center gap-2.5 pt-4 border-t border-line">
                <span className="text-[11px] font-semibold text-[#528d3a]">
                  02
                </span>
                <h2 className="m-0 text-sm font-semibold text-[#171a15]">
                  Reward and deadline
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
                <label className="flex flex-col gap-1.5 text-xs text-[#3d4439]">
                  <span>Reward in escrow</span>
                  <div className="flex items-center border border-line bg-white px-3 py-2.5 gap-2">
                    <input
                      className="w-full border-0 outline-0 text-xs bg-transparent"
                      type="number"
                      min="0.001"
                      max="1000000"
                      step="0.001"
                      required
                      value={reward}
                      onChange={(event) => setReward(event.target.value)}
                      placeholder="0.00"
                    />
                    <span className="text-[11px] text-muted">SOL</span>
                  </div>
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-[#3d4439]">
                  <span>Deadline</span>
                  <input
                    className="w-full px-3 py-2.5 border border-line bg-white text-foreground text-xs focus:outline-2 focus:outline-lime focus:outline-offset-1"
                    type="text"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
                    title="Use the year-month-day format"
                    placeholder="YYYY-MM-DD"
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                  />
                </label>
              </div>
              <button
                className="self-start inline-flex items-center gap-2.5 min-h-[46px] px-5 rounded-md bg-[#171a15] text-white border-0 text-xs font-medium cursor-pointer transition-colors duration-180 hover:bg-[#30372c]"
                type="submit"
              >
                Review bounty <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div className="p-7 border border-line bg-white flex flex-col items-start gap-4">
              <div className="grid place-items-center w-9 h-9 rounded-full bg-[#f0f5ec] text-[#528d3a]">
                <ShieldCheck size={20} />
              </div>
              <h2 className="m-0 text-xl font-semibold text-[#171a15]">
                Review before signing
              </h2>
              <p className="m-0 text-xs text-muted">
                Check the details and hash before continuing.
              </p>
              <dl className="w-full m-0 divide-y divide-line border-y border-line text-xs">
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-muted">Task</dt>
                  <dd className="m-0 font-medium text-[#171a15]">{title}</dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-muted">Workspace</dt>
                  <dd className="m-0 font-medium text-[#171a15]">
                    {workspace}
                  </dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-muted">Reward in escrow</dt>
                  <dd className="m-0 font-medium text-[#171a15]">
                    {reward} SOL
                  </dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-muted">Deadline</dt>
                  <dd className="m-0 font-medium text-[#171a15]">
                    {formatDeadline()}
                  </dd>
                </div>
                <div className="py-3 flex justify-between gap-4 text-[11px]">
                  <dt className="text-muted">Protocol fee (at settlement):</dt>
                  <dd className="m-0 text-muted">Pending / 0% in preview</dd>
                </div>
              </dl>
              <div className="w-full p-3 bg-soft border border-line flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-wider text-muted shrink-0">
                  SPEC HASH
                </span>
                <code className="font-mono text-[11px] truncate flex-1">
                  {specHash}
                </code>
                <button
                  type="button"
                  className="bg-transparent border-0 text-muted cursor-pointer hover:text-[#171a15]"
                  onClick={copyHash}
                  aria-label="Copy SHA-256 hash"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 min-h-[46px] px-5 rounded-md bg-[#171a15] text-white border-0 text-xs cursor-pointer hover:bg-[#30372c]"
                onClick={() => setWalletMessage(true)}
              >
                <Wallet size={16} /> Connect wallet to sign
              </button>
              {walletMessage && (
                <p
                  className="m-0 p-3 border border-[#e4c5a3] bg-[#fffaf4] text-[#59442f] text-[11px]"
                  role="status"
                >
                  Wallet connection and on-chain submission will be available
                  when the Solana program is integrated.
                </p>
              )}
              <button
                type="button"
                className="bg-transparent border-0 p-0 text-xs text-[#3f7331] font-semibold cursor-pointer hover:underline"
                onClick={() => setShowReview(false)}
              >
                Back to editing
              </button>
            </div>
          )}
        </section>
        <aside className="p-7 border border-line bg-soft flex flex-col gap-5">
          <div className="text-[10px] tracking-[0.06em] text-[#8a8e85]">
            KREDOWORK / MICRO BOUNTIES
          </div>
          <img
            src="/icon.svg"
            alt=""
            width={21}
            height={21}
            className="shrink-0 block"
            aria-hidden="true"
          />
          <h2 className="m-0 text-2xl font-semibold tracking-[-0.8px] leading-tight text-[#171a15]">
            Verifiable
            <br />
            from the start.
          </h2>
          <p className="m-0 text-xs text-[#646a60] leading-relaxed">
            The SHA-256 hash identifies the task terms before a transaction is
            prepared.
          </p>
          <div className="flex flex-col gap-3 pt-4 border-t border-line text-xs text-[#3d4439]">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-[#528d3a]">01</span>
              <span>Hashed specification</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-[#528d3a]">02</span>
              <span>Reward visible in escrow</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-[#528d3a]">03</span>
              <span>Clear deadline for everyone</span>
            </div>
          </div>
          <Link
            href="/workspaces/new"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#242820] no-underline pb-1 border-b border-lime self-start"
          >
            Create a workspace <ArrowRight size={14} />
          </Link>
        </aside>
      </div>
    </main>
  );
}
