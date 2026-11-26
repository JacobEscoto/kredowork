#[path = "common/mod.rs"]
mod common;

use anchor_lang::prelude::Pubkey;
use common::*;
use kredowork::state::BountyStatus;
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_signer::Signer;

const CLOCK_UNIX_TIMESTAMP: i64 = 1_700_000_000;
const DEADLINE_UNIX_TIMESTAMP: i64 = 1_700_086_400;
const DELIVERY_HASH: [u8; 32] = [7u8; 32];

// ── Setup helper ───────────────────────────────────────────────────────────────

/// Creates workspace + bounty + submitted work. Returns (workspace_pda, bounty_pda, reviewer, reviewer2).
fn setup_submitted_bounty(
    svm: &mut LiteSVM,
    authority: &Keypair,
    workspace_id: u64,
    contributor: &Keypair,
) -> (Pubkey, Pubkey, Keypair, Keypair) {
    let reviewer = Keypair::new();
    svm.airdrop(&reviewer.pubkey(), 10_000_000_000).expect("should fund reviewer");
    let reviewer2 = Keypair::new();
    svm.airdrop(&reviewer2.pubkey(), 10_000_000_000).expect("should fund reviewer2");

    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![reviewer.pubkey(), reviewer2.pubkey()];
    send_initialize_workspace_tx(svm, authority, workspace_pda, params)
        .expect("workspace should be initialized");

    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");
    let (bounty_pda, _) = derive_bounty_pda(&workspace_pda, 0);
    let (vault_pda, _) = derive_vault_pda(&bounty_pda);
    let ix = build_create_bounty_ix(
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        1_000_000_000,
        [9u8; 32],
        DEADLINE_UNIX_TIMESTAMP,
    );
    send_create_bounty_tx(svm, &sponsor, ix).expect("bounty should be created");

    let ix =
        build_submit_work_ix(contributor.pubkey(), workspace_pda, bounty_pda, 0, DELIVERY_HASH);
    send_submit_work_tx(svm, contributor, ix).expect("work should be submitted");

    (workspace_pda, bounty_pda, reviewer, reviewer2)
}

// ── Happy path: reject clears submission state ────────────────────────────────

#[test]
fn reject_work_happy_path() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("should fund contributor");

    let (workspace_pda, bounty_pda, reviewer, _) =
        setup_submitted_bounty(&mut svm, &authority, 701, &contributor);

    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    send_reject_work_tx(&mut svm, &reviewer, ix).expect("reject should succeed");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert!(bounty.status == BountyStatus::Rejected, "status should be Rejected");
    assert_eq!(bounty.claimant, None, "claimant should be cleared");
    assert_eq!(
        bounty.rejected_claimant,
        Some(contributor.pubkey()),
        "rejected_claimant should be the rejected contributor"
    );
    assert_eq!(
        bounty.rejected_by,
        Some(reviewer.pubkey()),
        "rejected_by should be the rejecting reviewer"
    );
    assert_eq!(bounty.delivery_hash, None, "delivery_hash should be cleared");
    assert_eq!(bounty.submitted_at_ts, None, "submitted_at_ts should be cleared");
    assert_eq!(bounty.approvals_count, 0, "approvals_count should be 0");
    assert_eq!(bounty.approvals_mask, 0, "approvals_mask should be 0");
    assert_eq!(
        bounty.window_ends_at_ts,
        Some(CLOCK_UNIX_TIMESTAMP + 3_600),
        "window_ends_at_ts should be the new submission window after rejection"
    );
    // Funds remain in the vault.
    assert_eq!(lamports(&svm, &derive_vault_pda(&bounty_pda).0), 1_000_000_000);
}

// ── Partial approvals are cleared by rejection ────────────────────────────────

#[test]
fn reject_work_clears_partial_approvals() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("should fund contributor");

    let (workspace_pda, bounty_pda, reviewer, reviewer2) =
        setup_submitted_bounty(&mut svm, &authority, 702, &contributor);

    // reviewer2 gives a partial approval first.
    let ix = build_approve_work_ix(reviewer2.pubkey(), workspace_pda, bounty_pda, 0);
    send_approve_work_tx(&mut svm, &reviewer2, ix).expect("partial approve should succeed");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty.approvals_count, 1);

    // reviewer rejects → clears everything.
    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    send_reject_work_tx(&mut svm, &reviewer, ix).expect("reject should succeed");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert!(bounty.status == BountyStatus::Rejected);
    assert_eq!(bounty.approvals_count, 0, "partial approvals cleared");
    assert_eq!(bounty.approvals_mask, 0, "mask cleared");
}

// ── Error: unauthorized reviewer ──────────────────────────────────────────────

#[test]
fn reject_work_fails_for_unauthorized_reviewer() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("should fund contributor");
    let unauthorized = Keypair::new();
    svm.airdrop(&unauthorized.pubkey(), 10_000_000_000).expect("should fund unauthorized");

    let (workspace_pda, bounty_pda, _, _) =
        setup_submitted_bounty(&mut svm, &authority, 703, &contributor);

    let ix = build_reject_work_ix(unauthorized.pubkey(), workspace_pda, bounty_pda, 0);
    let err = send_reject_work_tx(&mut svm, &unauthorized, ix)
        .expect_err("unauthorized reviewer cannot reject");

    let err_msg = &err;
    assert!(
        err_msg.contains("UnauthorizedReviewer") || err_msg.contains("6004"),
        "unexpected error: {err_msg}"
    );
}

#[test]
fn reject_work_increments_submission_attempts() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("should fund contributor");

    let (workspace_pda, bounty_pda, reviewer, _) =
        setup_submitted_bounty(&mut svm, &authority, 707, &contributor);

    let bounty_before = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty_before.submission_attempts, 0);

    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    send_reject_work_tx(&mut svm, &reviewer, ix).expect("reject should succeed");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(
        bounty.submission_attempts, 1,
        "reject should increment submission_attempts"
    );
}

// ── Error: contributor tries to reject their own work ────────────────────────

#[test]
fn reject_work_fails_for_self_rejection() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    // The contributor is also listed as reviewer.
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("should fund contributor");
    let other_reviewer = Keypair::new();
    svm.airdrop(&other_reviewer.pubkey(), 10_000_000_000).expect("should fund other_reviewer");

    let workspace_id = 704_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    // Contributor is at index 0 in the reviewers list.
    params.reviewers = vec![contributor.pubkey(), other_reviewer.pubkey()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params)
        .expect("workspace should be initialized");

    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");
    let (bounty_pda, _) = derive_bounty_pda(&workspace_pda, 0);
    let (vault_pda, _) = derive_vault_pda(&bounty_pda);
    let ix = build_create_bounty_ix(
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        500_000_000,
        [5u8; 32],
        DEADLINE_UNIX_TIMESTAMP,
    );
    send_create_bounty_tx(&mut svm, &sponsor, ix).expect("bounty should be created");

    let ix =
        build_submit_work_ix(contributor.pubkey(), workspace_pda, bounty_pda, 0, DELIVERY_HASH);
    send_submit_work_tx(&mut svm, &contributor, ix).expect("work should be submitted");

    // Contributor tries to self-reject.
    let ix = build_reject_work_ix(contributor.pubkey(), workspace_pda, bounty_pda, 0);
    let err = send_reject_work_tx(&mut svm, &contributor, ix)
        .expect_err("contributor cannot self-reject");

    let err_msg = &err;
    assert!(
        err_msg.contains("SelfApprovalNotAllowed") || err_msg.contains("6007"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: reject a bounty that is not Submitted ──────────────────────────────

#[test]
fn reject_work_fails_when_bounty_not_submitted() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let reviewer = Keypair::new();
    svm.airdrop(&reviewer.pubkey(), 10_000_000_000).expect("should fund reviewer");
    let reviewer2 = Keypair::new();
    svm.airdrop(&reviewer2.pubkey(), 10_000_000_000).expect("should fund reviewer2");

    let workspace_id = 705_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![reviewer.pubkey(), reviewer2.pubkey()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params)
        .expect("workspace should be initialized");

    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");
    let (bounty_pda, _) = derive_bounty_pda(&workspace_pda, 0);
    let (vault_pda, _) = derive_vault_pda(&bounty_pda);
    let ix = build_create_bounty_ix(
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        500_000_000,
        [6u8; 32],
        DEADLINE_UNIX_TIMESTAMP,
    );
    send_create_bounty_tx(&mut svm, &sponsor, ix).expect("bounty should be created");
    // Bounty is Open, never submitted.

    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    let err = send_reject_work_tx(&mut svm, &reviewer, ix)
        .expect_err("cannot reject an Open bounty");

    let err_msg = &err;
    assert!(
        err_msg.contains("InvalidStateTransition") || err_msg.contains("6003"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: workspace paused ────────────────────────────────────────────────────

#[test]
fn reject_work_fails_when_workspace_paused() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("should fund contributor");

    let (workspace_pda, bounty_pda, reviewer, _) =
        setup_submitted_bounty(&mut svm, &authority, 706, &contributor);

    set_workspace_paused(&mut svm, &workspace_pda, true);

    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    let err = send_reject_work_tx(&mut svm, &reviewer, ix)
        .expect_err("should fail when workspace is paused");

    let err_msg = &err;
    assert!(
        err_msg.contains("WorkspacePaused") || err_msg.contains("6000"),
        "unexpected error: {err_msg}"
    );
}
