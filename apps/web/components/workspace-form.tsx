"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";

export function WorkspaceForm() {
  const [reviewers, setReviewers] = useState([""]);
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
  const addReviewer = () => setReviewers((current) => [...current, ""]);
  const removeReviewer = (index: number) =>
    setReviewers((current) => current.filter((_, i) => i !== index));

  return (
    <main className="flow-page">
      <header className="flow-header">
        <Link
          className="flow-brand"
          href="/bounties"
          aria-label="KredoWork home"
        >
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
        <Link className="flow-back" href="/bounties">
          <ArrowLeft size={15} /> Back to bounties
        </Link>
      </header>
      <div className="flow-layout">
        <section className="flow-content" aria-labelledby="workspace-title">
          <div className="flow-progress">
            <span className="progress-current">01</span>
            <span className="progress-line" />
            <span>WORKSPACE SETTINGS</span>
          </div>
          <h1 id="workspace-title" className="flow-title">
            Create a<br />
            workspace<span>.</span>
          </h1>
          <p className="flow-lede">
            Choose who can review contributions and set the time allowed for
            each stage.
          </p>
          {!reviewed ? (
            <form
              className="flow-form"
              onSubmit={(event) => {
                event.preventDefault();
                setReviewed(true);
              }}
            >
              <div className="form-section-head">
                <span>01</span>
                <h2>Workspace details</h2>
              </div>
              <label className="form-field">
                <span>
                  Workspace name <b>Required</b>
                </span>
                <input
                  required
                  maxLength={60}
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="e.g. Solana Core Infrastructure"
                />
              </label>
              <label className="form-field">
                <span>
                  Description <b>Optional</b>
                </span>
                <textarea
                  maxLength={280}
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What kind of work belongs here?"
                />
              </label>
              <div className="form-section-head reviewers-head">
                <span>02</span>
                <h2>Authorized reviewers</h2>
              </div>
              <p className="field-help">
                Add Solana addresses that can approve submissions.
              </p>
              <div className="reviewer-list">
                {reviewers.map((reviewer, index) => (
                  <div className="reviewer-input-row" key={index}>
                    <label className="sr-only" htmlFor={`reviewer-${index}`}>
                      Reviewer address {index + 1}
                    </label>
                    <input
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
                        className="remove-reviewer"
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
                className="add-reviewer"
                onClick={addReviewer}
              >
                <Plus size={14} /> Add reviewer
              </button>
              <div className="form-section-head windows-head">
                <span>03</span>
                <h2>Default time windows</h2>
              </div>
              <p className="field-help">
                These values can be adjusted for each bounty.
              </p>
              <div className="window-grid">
                <label className="form-field">
                  <span>Claim</span>
                  <div className="number-field">
                    <input
                      type="number"
                      min="1"
                      max="8760"
                      required
                      value={claimWindow}
                      onChange={(event) => setClaimWindow(event.target.value)}
                    />
                    <span>hours</span>
                  </div>
                </label>
                <label className="form-field">
                  <span>Work</span>
                  <div className="number-field">
                    <input
                      type="number"
                      min="1"
                      max="8760"
                      required
                      value={workWindow}
                      onChange={(event) => setWorkWindow(event.target.value)}
                    />
                    <span>hours</span>
                  </div>
                </label>
                <label className="form-field">
                  <span>Review</span>
                  <div className="number-field">
                    <input
                      type="number"
                      min="1"
                      max="8760"
                      required
                      value={reviewWindow}
                      onChange={(event) => setReviewWindow(event.target.value)}
                    />
                    <span>hours</span>
                  </div>
                </label>
              </div>
              <button className="flow-submit" type="submit">
                Review workspace <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div className="review-panel">
              <div className="review-icon">✓</div>
              <h2>Review your workspace</h2>
              <p>The settings are ready to prepare the transaction.</p>
              <dl>
                <div>
                  <dt>Name</dt>
                  <dd>{workspaceName}</dd>
                </div>
                <div>
                  <dt>Reviewers</dt>
                  <dd>
                    {reviewers.filter(Boolean).length || "None added yet"}
                  </dd>
                </div>
                <div>
                  <dt>Time windows</dt>
                  <dd>
                    {claimWindow} h claim · {workWindow} h work · {reviewWindow}{" "}
                    h review
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                className="flow-submit"
                onClick={() => setReviewed(false)}
              >
                Back to editing
              </button>
              <p className="chain-note">
                On-chain publishing will be available when a compatible wallet
                is connected.
              </p>
            </div>
          )}
        </section>
        <aside className="flow-aside">
          <div className="aside-index">KREDOWORK / WORKSPACES</div>
          <div className="aside-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <h2>
            A shared place
            <br />
            to coordinate.
          </h2>
          <p>
            Workspaces bring tasks, reviewers, and time rules together under one
            shared setup.
          </p>
          <div className="aside-facts">
            <div>
              <span className="fact-number">01</span>
              <span>Transparent reviews</span>
            </div>
            <div>
              <span className="fact-number">02</span>
              <span>Workspace-defined rules</span>
            </div>
            <div>
              <span className="fact-number">03</span>
              <span>Open coordination</span>
            </div>
          </div>
          <Link href="/bounties/new" className="aside-link">
            Post a bounty <ArrowRight size={14} />
          </Link>
        </aside>
      </div>
    </main>
  );
}
