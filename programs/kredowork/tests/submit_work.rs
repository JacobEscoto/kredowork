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
const DELIVERY_HASH_2: [u8; 32] = [8u8; 32];

// ── Setup helpers ──────────────────────────────────────────────────────────────

fn setup_open_bounty(
    svm: &mut LiteSVM,
    authority: &Keypair,
    sponsor: &Keypair,
) -> (Pubkey, Pubkey, Pubkey, u64) {
    // Returns (workspace_pda, bounty_pda, vault_pda, bounty_id)
    let workspace_id = 201_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![Pubkey::new_unique(), Pubkey::new_unique()];
    send_initialize_workspace_tx(svm, authority, workspace_pda, params)
        .expect("workspace should be initialized");

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
    send_create_bounty_tx(svm, sponsor, ix).expect("bounty should be created");

    (workspace_pda, bounty_pda, vault_pda, 0)
}

// ── Happy path ─────────────────────────────────────────────────────────────────

#[test]
fn submit_work_happy_path() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");

    let (workspace_pda, bounty_pda, _vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor);

    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000)
        .expect("should fund contributor");

    let ix = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        bounty_id,
        DELIVERY_HASH,
    );
    send_submit_work_tx(&mut svm, &contributor, ix).expect("work should be submitted");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty.bounty_id, bounty_id);
    assert_eq!(bounty.claimant, Some(contributor.pubkey()));
    assert_eq!(bounty.delivery_hash, Some(DELIVERY_HASH));
    assert!(bounty.status == BountyStatus::Submitted);
    assert_eq!(bounty.submitted_at_ts, Some(CLOCK_UNIX_TIMESTAMP));
    assert_eq!(bounty.approvals_count, 0);
    assert_eq!(bounty.approvals_mask, 0);
}

// ── Error: past deadline ───────────────────────────────────────────────────────

#[test]
fn submit_work_fails_after_deadline() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");

    let (workspace_pda, bounty_pda, _vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor);

    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000)
        .expect("should fund contributor");

    // Advance clock past deadline.
    set_sysvar_clock(&mut svm, DEADLINE_UNIX_TIMESTAMP + 1);

    let ix = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        bounty_id,
        DELIVERY_HASH,
    );
    let err = send_submit_work_tx(&mut svm, &contributor, ix)
        .expect_err("should fail if work is submitted after deadline");

    let err_msg = &err;
    assert!(
        err_msg.contains("WindowExpired") || err_msg.contains("6010"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: status not Open or Claimed (double-submit) ─────────────────────────

#[test]
fn submit_work_fails_when_already_submitted() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");

    let (workspace_pda, bounty_pda, _vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor);

    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000)
        .expect("should fund contributor");

    // First submission succeeds → status becomes Submitted.
    let ix = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        bounty_id,
        DELIVERY_HASH,
    );
    send_submit_work_tx(&mut svm, &contributor, ix).expect("work should be submitted");

    // Second submission must fail: status is Submitted, not Open/Claimed.
    let ix2 = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        bounty_id,
        DELIVERY_HASH_2,
    );
    let err = send_submit_work_tx(&mut svm, &contributor, ix2)
        .expect_err("should fail if bounty is not in Open or Claimed");

    let err_msg = &err;
    assert!(
        err_msg.contains("InvalidStateTransition") || err_msg.contains("6003"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: status not Open or Claimed (after cancelled) ───────────────────────

#[test]
fn submit_work_fails_when_bounty_is_cancelled() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor);

    // Cancel the bounty first.
    let ix = build_cancel_bounty_ix(
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        bounty_id,
    );
    send_instruction(&mut svm, ix, &sponsor, &sponsor.pubkey())
        .expect("cancellation should succeed");

    // Now try to submit work – should fail.
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000)
        .expect("should fund contributor");

    let ix2 = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        bounty_id,
        DELIVERY_HASH,
    );
    let err = send_submit_work_tx(&mut svm, &contributor, ix2)
        .expect_err("should fail if bounty is Cancelled");

    let err_msg = &err;
    assert!(
        err_msg.contains("InvalidStateTransition") || err_msg.contains("6003"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: workspace paused ────────────────────────────────────────────────────

#[test]
fn submit_work_fails_when_workspace_paused() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");

    let (workspace_pda, bounty_pda, _vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor);

    // Pause the workspace directly in state.
    set_workspace_paused(&mut svm, &workspace_pda, true);

    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000)
        .expect("should fund contributor");

    let ix = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        bounty_id,
        DELIVERY_HASH,
    );
    let err = send_submit_work_tx(&mut svm, &contributor, ix)
        .expect_err("should fail when workspace is paused");

    let err_msg = &err;
    assert!(
        err_msg.contains("WorkspacePaused") || err_msg.contains("6000"),
        "unexpected error: {err_msg}"
    );
}

// ── Re-submit after rejection ──────────────────────────────────────────────────

#[test]
fn submit_work_succeeds_after_rejection() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");

    // Use workspace with reviewers that we control.
    let workspace_id = 202_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let reviewer = Keypair::new();
    svm.airdrop(&reviewer.pubkey(), 10_000_000_000).expect("should fund reviewer");
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![reviewer.pubkey(), Pubkey::new_unique()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params)
        .expect("workspace should be initialized");

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
    send_create_bounty_tx(&mut svm, &sponsor, ix).expect("bounty should be created");

    let contributor1 = Keypair::new();
    svm.airdrop(&contributor1.pubkey(), 10_000_000_000)
        .expect("should fund contributor1");

    // Contributor1 submits.
    let ix = build_submit_work_ix(
        contributor1.pubkey(),
        workspace_pda,
        bounty_pda,
        0,
        DELIVERY_HASH,
    );
    send_submit_work_tx(&mut svm, &contributor1, ix).expect("first submit should succeed");

    // Reviewer rejects → bounty returns to Rejected (claimant cleared).
    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    send_reject_work_tx(&mut svm, &reviewer, ix).expect("reject should succeed");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert!(bounty.status == BountyStatus::Rejected);
    assert_eq!(bounty.claimant, None);
    assert_eq!(bounty.approvals_mask, 0);
    assert_eq!(bounty.approvals_count, 0);

    // A different contributor submits after rejection – status is Rejected and
    // the attempt window has expired, so the submission is accepted again.
    set_sysvar_clock(&mut svm, DEADLINE_UNIX_TIMESTAMP);
    let contributor2 = Keypair::new();
    svm.airdrop(&contributor2.pubkey(), 10_000_000_000)
        .expect("should fund contributor2");

    let ix2 = build_submit_work_ix(
        contributor2.pubkey(),
        workspace_pda,
        bounty_pda,
        0,
        DELIVERY_HASH_2,
    );
    send_submit_work_tx(&mut svm, &contributor2, ix2).expect("resubmit after rejection should succeed");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty.claimant, Some(contributor2.pubkey()));
    assert!(bounty.status == BountyStatus::Submitted);
}

// ── Error: max submission attempts reached after repeated rejections ──────────

#[test]
fn submit_work_fails_on_max_attempts_reached() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");

    // Use workspace with reviewers that we control.
    let workspace_id = 203_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let reviewer = Keypair::new();
    svm.airdrop(&reviewer.pubkey(), 10_000_000_000).expect("should fund reviewer");
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![reviewer.pubkey(), Pubkey::new_unique()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params)
        .expect("workspace should be initialized");

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
    send_create_bounty_tx(&mut svm, &sponsor, ix).expect("bounty should be created");

    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("should fund contributor");

    // submit → reject → submit → reject → submit → reject → submit (exhausted).
    let ix = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        0,
        DELIVERY_HASH,
    );
    send_submit_work_tx(&mut svm, &contributor, ix).expect("submit should succeed");

    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    send_reject_work_tx(&mut svm, &reviewer, ix).expect("reject should succeed");
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP + 4_000);

    let ix = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        0,
        DELIVERY_HASH,
    );
    send_submit_work_tx(&mut svm, &contributor, ix).expect("resubmit should succeed");

    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    send_reject_work_tx(&mut svm, &reviewer, ix).expect("reject should succeed");
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP + 8_000);

    let ix = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        0,
        DELIVERY_HASH,
    );
    send_submit_work_tx(&mut svm, &contributor, ix).expect("resubmit should succeed");

    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    send_reject_work_tx(&mut svm, &reviewer, ix).expect("reject should succeed");
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP + 12_000);

    // The submission attempts counter is now exhausted (max_submission_attempts).
    let ix = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        0,
        DELIVERY_HASH,
    );
    let err = send_submit_work_tx(&mut svm, &contributor, ix)
        .expect_err("submit after max attempts should fail");

    let err_msg = &err;
    assert!(
        err_msg.contains("MaxAttemptsReached") || err_msg.contains("6016"),
        "unexpected error: {err_msg}"
    );
}
