"use client";

import { useState } from "react";
import Link from "next/link";
import Brand from "@/components/brand";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { isAddress } from "@solana/kit";
import { useTranslation } from "@/components/language-provider";

export function WorkspaceForm() {
  const { translate: t } = useTranslation();
  const [reviewers, setReviewers] = useState([""]);
  const [reviewerError, setReviewerError] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [description, setDescription] = useState("");
  const [claimWindow, setClaimWindow] = useState("72");
  const [workWindow, setWorkWindow] = useState("168");
  const [reviewWindow, setReviewWindow] = useState("48");

  const updateReviewer = (index: number, value: string) =>
    setReviewers((current) =>
      current.map((reviewer, i) => (i === index ? value : reviewer)),
    );
  const addReviewer = () =>
    setReviewers((current) => current.length < 8 ? [...current, ""] : current);
  const removeReviewer = (index: number) =>
    setReviewers((current) => current.filter((_, i) => i !== index));

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
        <section className="max-w-[620px]" aria-labelledby="workspace-title">
          <div className="flex items-center gap-3 text-[11px] text-[#697063] mb-5">
            <span className="font-semibold text-[#171a15]">01</span>
            <span className="w-6 h-px bg-lime" />
            <span>WORKSPACE SETTINGS</span>
          </div>
          <h1
            id="workspace-title"
            className="m-0 text-[clamp(40px,5vw,60px)] leading-none tracking-[-3px] font-semibold text-[#171a15] [&_span]:text-lime"
          >
            Create a<br />
            workspace<span>.</span>
          </h1>
          <p className="mt-4 mb-8 text-sm text-[#646a60] leading-relaxed max-w-[460px]">
            Choose who can review contributions and set the time allowed for
            each stage.
          </p>
          {!reviewed ? (
            <form
              className="flex flex-col gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                const activeReviewers = reviewers.map((reviewer) => reviewer.trim()).filter(Boolean);
                const unique = new Set(activeReviewers);
                if (activeReviewers.length < 1 || activeReviewers.length > 8 || activeReviewers.some((reviewer) => !isAddress(reviewer)) || unique.size !== activeReviewers.length) {
                  setReviewerError(t("workspace.reviewersInvalid"));
                  return;
                }
                if ([claimWindow, workWindow, reviewWindow].some((window) => !Number.isInteger(Number(window)) || Number(window) <= 0)) {
                  setReviewerError(t("workspace.windowsInvalid"));
                  return;
                }
                setReviewerError("");
                setReviewed(true);
              }}
            >
              <div className="flex items-center gap-2.5 pt-2 border-t border-line">
                <span className="text-[11px] font-semibold text-[#528d3a]">
                  01
                </span>
                <h2 className="m-0 text-sm font-semibold text-[#171a15]">
                  Workspace details
                </h2>
              </div>
              <label className="flex flex-col gap-1.5 text-xs text-[#3d4439]">
                <span className="flex items-center justify-between">
                  Workspace name{" "}
                  <b className="font-normal text-[10px] text-[#8a8e85]">
                    Required
                  </b>
                </span>
                <input
                  className="w-full px-3 py-2.5 border border-line bg-white text-foreground text-xs focus:outline-2 focus:outline-lime focus:outline-offset-1"
                  required
                  maxLength={60}
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="e.g. Solana Core Infrastructure"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-[#3d4439]">
                <span className="flex items-center justify-between">
                  Description{" "}
                  <b className="font-normal text-[10px] text-[#8a8e85]">
                    Optional
                  </b>
                </span>
                <textarea
                  className="w-full px-3 py-2.5 border border-line bg-white text-foreground text-xs focus:outline-2 focus:outline-lime focus:outline-offset-1"
                  maxLength={280}
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What kind of work belongs here?"
                />
              </label>
              <div className="flex items-center gap-2.5 pt-4 border-t border-line">
                <span className="text-[11px] font-semibold text-[#528d3a]">
                  02
                </span>
                <h2 className="m-0 text-sm font-semibold text-[#171a15]">
                  Authorized reviewers
                </h2>
              </div>
              <p className="m-0 text-xs text-muted">
                Add Solana addresses that can approve submissions (1–8, unique).
              </p>
              <p className="m-0 p-3 border border-[#e4c5a3] bg-[#fffaf4] text-[#59442f] text-xs" role="note">
                {t("workspace.authorityReviewerInfo")} {t("workspace.independentReviewers")}
              </p>
              <div className="flex flex-col gap-2.5">
                {reviewers.map((reviewer, index) => (
                  <div className="flex items-center gap-2" key={index}>
                    <label className="sr-only" htmlFor={`reviewer-${index}`}>
                      Reviewer address {index + 1}
                    </label>
                    <input
                      className="flex-1 px-3 py-2.5 border border-line bg-white text-foreground text-xs font-mono focus:outline-2 focus:outline-lime focus:outline-offset-1"
                      id={`reviewer-${index}`}
                      required={index === 0}
                      pattern="[1-9A-HJ-NP-Za-km-z]{32,44}"
                      title="Enter a valid public Solana address"
                      value={reviewer}
                      onChange={(event) =>
                        updateReviewer(index, event.target.value)
                      }
                      placeholder="Public Solana address"
                      spellCheck={false}
                    />
                    {reviewers.length > 1 && (
                      <button
                        type="button"
                        className="grid place-items-center w-9 h-9 rounded-md border border-line bg-white text-muted cursor-pointer hover:text-[#a24132] hover:border-[#e3b9b2]"
                        aria-label={`Remove reviewer ${index + 1}`}
                        onClick={() => removeReviewer(index)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="self-start inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-line bg-white text-[#3d4439] text-xs cursor-pointer hover:bg-soft disabled:opacity-50"
                onClick={addReviewer}
                disabled={reviewers.length >= 8}
              >
                <Plus size={14} /> Add reviewer
              </button>
              <div className="flex items-center gap-2.5 pt-4 border-t border-line">
                <span className="text-[11px] font-semibold text-[#528d3a]">
                  03
                </span>
                <h2 className="m-0 text-sm font-semibold text-[#171a15]">
                  Default time windows
                </h2>
              </div>
              <p className="m-0 text-xs text-muted">
                These values can be adjusted for each bounty.
              </p>
              <div className="grid grid-cols-3 gap-3 max-[560px]:grid-cols-1">
                <label className="flex flex-col gap-1.5 text-xs text-[#3d4439]">
                  <span>Claim</span>
                  <div className="flex items-center border border-line bg-white px-3 py-2 gap-2">
                    <input
                      className="w-full border-0 outline-0 text-xs bg-transparent"
                      type="number"
                      min="1"
                      max="8760"
                      required
                      value={claimWindow}
                      onChange={(event) => setClaimWindow(event.target.value)}
                    />
                    <span className="text-[11px] text-muted">hours</span>
                  </div>
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-[#3d4439]">
                  <span>Work</span>
                  <div className="flex items-center border border-line bg-white px-3 py-2 gap-2">
                    <input
                      className="w-full border-0 outline-0 text-xs bg-transparent"
                      type="number"
                      min="1"
                      max="8760"
                      required
                      value={workWindow}
                      onChange={(event) => setWorkWindow(event.target.value)}
                    />
                    <span className="text-[11px] text-muted">hours</span>
                  </div>
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-[#3d4439]">
                  <span>Review</span>
                  <div className="flex items-center border border-line bg-white px-3 py-2 gap-2">
                    <input
                      className="w-full border-0 outline-0 text-xs bg-transparent"
                      type="number"
                      min="1"
                      max="8760"
                      required
                      value={reviewWindow}
                      onChange={(event) => setReviewWindow(event.target.value)}
                    />
                    <span className="text-[11px] text-muted">hours</span>
                  </div>
                </label>
              </div>
              {reviewerError && <p className="m-0 text-xs text-[#a24132]" role="alert">{reviewerError}</p>}
              <button
                className="self-start inline-flex items-center gap-2.5 min-h-[46px] px-5 rounded-md bg-[#171a15] text-white border-0 text-xs font-medium cursor-pointer transition-colors duration-180 hover:bg-[#30372c]"
                type="submit"
              >
                Review workspace <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div className="p-7 border border-line bg-white flex flex-col items-start gap-4">
              <div className="grid place-items-center w-9 h-9 rounded-full bg-[#f0f5ec] text-[#528d3a] font-bold">
                ✓
              </div>
              <h2 className="m-0 text-xl font-semibold text-[#171a15]">
                Review your workspace
              </h2>
              <p className="m-0 text-xs text-muted">
                The settings are ready to prepare the transaction.
              </p>
              <dl className="w-full m-0 divide-y divide-line border-y border-line text-xs">
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-muted">Name</dt>
                  <dd className="m-0 font-medium text-[#171a15]">
                    {workspaceName}
                  </dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-muted">Reviewers</dt>
                  <dd className="m-0 font-medium text-[#171a15]">
                    {reviewers.filter(Boolean).length || "None added yet"}
                  </dd>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <dt className="text-muted">Time windows</dt>
                  <dd className="m-0 font-medium text-[#171a15]">
                    {claimWindow} h claim · {workWindow} h work · {reviewWindow}{" "}
                    h review
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-md bg-[#171a15] text-white border-0 text-xs cursor-pointer hover:bg-[#30372c]"
                onClick={() => setReviewed(false)}
              >
                Back to editing
              </button>
              <p className="m-0 text-[11px] text-[#8a8e85]">
                On-chain publishing will be available when a compatible wallet
                is connected.
              </p>
            </div>
          )}
        </section>
        <aside className="p-7 border border-line bg-soft flex flex-col gap-5">
          <div className="text-[10px] tracking-[0.06em] text-[#8a8e85]">
            KREDOWORK / WORKSPACES
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
            A shared place
            <br />
            to coordinate.
          </h2>
          <p className="m-0 text-xs text-[#646a60] leading-relaxed">
            Workspaces bring tasks, reviewers, and time rules together under one
            shared setup.
          </p>
          <div className="flex flex-col gap-3 pt-4 border-t border-line text-xs text-[#3d4439]">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-[#528d3a]">01</span>
              <span>Transparent reviews</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-[#528d3a]">02</span>
              <span>Workspace-defined rules</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-[#528d3a]">03</span>
              <span>Open coordination</span>
            </div>
          </div>
          <Link
            href="/bounties/new"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#242820] no-underline pb-1 border-b border-lime self-start"
          >
            Post a bounty <ArrowRight size={14} />
          </Link>
        </aside>
      </div>
    </main>
  );
}
