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

/// Creates workspace + bounty + submitted work. Returns (workspace_pda, bounty_pda, reviewer_kp).
fn setup_submitted_bounty(
    svm: &mut LiteSVM,
    authority: &Keypair,
    workspace_id: u64,
    contributor: &Keypair,
) -> (Pubkey, Pubkey, Keypair, Keypair) {
    let reviewer = Keypair::new();
    svm.airdrop(&reviewer.pubkey(), 10_000_000_000).expect("financiar reviewer");
    let reviewer2 = Keypair::new();
    svm.airdrop(&reviewer2.pubkey(), 10_000_000_000).expect("financiar reviewer2");

    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![reviewer.pubkey(), reviewer2.pubkey()];
    send_initialize_workspace_tx(svm, authority, workspace_pda, params)
        .expect("workspace init");

    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");
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
    send_create_bounty_tx(svm, &sponsor, ix).expect("bounty create");

    let ix =
        build_submit_work_ix(contributor.pubkey(), workspace_pda, bounty_pda, 0, DELIVERY_HASH);
    send_submit_work_tx(svm, contributor, ix).expect("submit work");

    (workspace_pda, bounty_pda, reviewer, reviewer2)
}

// ── Happy path: reject clears submission state ────────────────────────────────

#[test]
fn reject_work_happy_path() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    let (workspace_pda, bounty_pda, reviewer, _) =
        setup_submitted_bounty(&mut svm, &authority, 701, &contributor);

    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    send_reject_work_tx(&mut svm, &reviewer, ix).expect("reject debe ejecutarse");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert!(bounty.status == BountyStatus::Rejected, "estado debe ser Rejected");
    assert_eq!(bounty.claimant, None, "claimant debe limpiarse");
    assert_eq!(bounty.delivery_hash, None, "delivery_hash debe limpiarse");
    assert_eq!(bounty.submitted_at_ts, None, "submitted_at_ts debe limpiarse");
    assert_eq!(bounty.approvals_count, 0, "approvals_count debe ser 0");
    assert_eq!(bounty.approvals_mask, 0, "approvals_mask debe ser 0");
    assert_eq!(bounty.window_ends_at_ts, None, "window debe quedar None");
    // Funds remain in the vault.
    assert_eq!(lamports(&svm, &derive_vault_pda(&bounty_pda).0), 1_000_000_000);
}

// ── Partial approvals are cleared by rejection ────────────────────────────────

#[test]
fn reject_work_clears_partial_approvals() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    let (workspace_pda, bounty_pda, reviewer, reviewer2) =
        setup_submitted_bounty(&mut svm, &authority, 702, &contributor);

    // reviewer2 gives a partial approval first.
    let ix = build_approve_work_ix(reviewer2.pubkey(), workspace_pda, bounty_pda, 0);
    send_approve_work_tx(&mut svm, &reviewer2, ix).expect("partial approve debe pasar");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty.approvals_count, 1);

    // reviewer rejects → clears everything.
    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    send_reject_work_tx(&mut svm, &reviewer, ix).expect("reject debe ejecutarse");

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
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");
    let unauthorized = Keypair::new();
    svm.airdrop(&unauthorized.pubkey(), 10_000_000_000).expect("financiar unauthorized");

    let (workspace_pda, bounty_pda, _, _) =
        setup_submitted_bounty(&mut svm, &authority, 703, &contributor);

    let ix = build_reject_work_ix(unauthorized.pubkey(), workspace_pda, bounty_pda, 0);
    let err = send_reject_work_tx(&mut svm, &unauthorized, ix)
        .expect_err("unauthorized no puede rechazar");

    let err_msg = &err;
    assert!(
        err_msg.contains("UnauthorizedReviewer") || err_msg.contains("6004"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: contributor tries to reject their own work ────────────────────────

#[test]
fn reject_work_fails_for_self_rejection() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    // The contributor is also listed as reviewer.
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");
    let other_reviewer = Keypair::new();
    svm.airdrop(&other_reviewer.pubkey(), 10_000_000_000).expect("financiar other_reviewer");

    let workspace_id = 704_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    // Contributor is at index 0 in the reviewers list.
    params.reviewers = vec![contributor.pubkey(), other_reviewer.pubkey()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params)
        .expect("workspace init");

    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");
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
    send_create_bounty_tx(&mut svm, &sponsor, ix).expect("bounty create");

    let ix =
        build_submit_work_ix(contributor.pubkey(), workspace_pda, bounty_pda, 0, DELIVERY_HASH);
    send_submit_work_tx(&mut svm, &contributor, ix).expect("submit work");

    // Contributor tries to self-reject.
    let ix = build_reject_work_ix(contributor.pubkey(), workspace_pda, bounty_pda, 0);
    let err = send_reject_work_tx(&mut svm, &contributor, ix)
        .expect_err("el contributor no puede auto-rechazar");

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
    svm.airdrop(&reviewer.pubkey(), 10_000_000_000).expect("financiar reviewer");
    let reviewer2 = Keypair::new();
    svm.airdrop(&reviewer2.pubkey(), 10_000_000_000).expect("financiar reviewer2");

    let workspace_id = 705_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![reviewer.pubkey(), reviewer2.pubkey()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params)
        .expect("workspace init");

    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");
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
    send_create_bounty_tx(&mut svm, &sponsor, ix).expect("bounty create");
    // Bounty is Open, never submitted.

    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    let err = send_reject_work_tx(&mut svm, &reviewer, ix)
        .expect_err("no se puede rechazar un bounty Open");

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
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    let (workspace_pda, bounty_pda, reviewer, _) =
        setup_submitted_bounty(&mut svm, &authority, 706, &contributor);

    set_workspace_paused(&mut svm, &workspace_pda, true);

    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    let err = send_reject_work_tx(&mut svm, &reviewer, ix)
        .expect_err("debe fallar si el workspace está pausado");

    let err_msg = &err;
    assert!(
        err_msg.contains("WorkspacePaused") || err_msg.contains("6000"),
        "unexpected error: {err_msg}"
    );
}
