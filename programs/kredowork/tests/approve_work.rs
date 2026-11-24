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

/// Creates a workspace with `reviewers`, creates a bounty, and has `contributor` submit work.
/// Returns (workspace_pda, bounty_pda, bounty_id).
/// NOTE: each test uses a unique workspace_id so PDAs never collide across tests.
fn setup_submitted_bounty_with_reviewers(
    svm: &mut LiteSVM,
    authority: &Keypair,
    workspace_id: u64,
    reviewers: Vec<Pubkey>,
    contributor: &Keypair,
) -> (Pubkey, Pubkey, u64) {
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = reviewers;
    params.quorum_threshold = 2;
    send_initialize_workspace_tx(svm, authority, workspace_pda, params)
        .expect("el workspace debe inicializarse");

    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("debe financiar el sponsor");
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
    send_create_bounty_tx(svm, &sponsor, ix).expect("el bounty debe crearse");

    let ix =
        build_submit_work_ix(contributor.pubkey(), workspace_pda, bounty_pda, 0, DELIVERY_HASH);
    send_submit_work_tx(svm, contributor, ix).expect("el work debe enviarse");

    (workspace_pda, bounty_pda, 0)
}

fn approve_with(
    svm: &mut LiteSVM,
    reviewer: &Keypair,
    workspace_pda: Pubkey,
    bounty_pda: Pubkey,
    bounty_id: u64,
) -> Result<(), String> {
    let ix = build_approve_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, bounty_id);
    send_approve_work_tx(svm, reviewer, ix)
}

// ── Happy path: single approval, quorum not yet reached ───────────────────────

#[test]
fn approve_work_partial_quorum() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let reviewer1 = Keypair::new();
    svm.airdrop(&reviewer1.pubkey(), 10_000_000_000).expect("debe financiar reviewer1");
    let reviewer2 = Keypair::new();
    svm.airdrop(&reviewer2.pubkey(), 10_000_000_000).expect("debe financiar reviewer2");
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("debe financiar contributor");

    let (workspace_pda, bounty_pda, bounty_id) = setup_submitted_bounty_with_reviewers(
        &mut svm,
        &authority,
        301,
        vec![reviewer1.pubkey(), reviewer2.pubkey()],
        &contributor,
    );

    // Only reviewer1 approves → quorum (2) not reached.
    approve_with(&mut svm, &reviewer1, workspace_pda, bounty_pda, bounty_id)
        .expect("el primer revisor debe aprobar");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty.approvals_count, 1);
    // Bit 0 set for reviewer at index 0.
    assert_ne!(bounty.approvals_mask & (1u8 << 0), 0, "bit 0 should be set");
    assert!(bounty.status == BountyStatus::Submitted, "still Submitted");
    assert_eq!(bounty.window_ends_at_ts, None);
}

// ── Happy path: second approval reaches quorum → PreApproved ──────────────────

#[test]
fn approve_work_reaches_quorum() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let reviewer1 = Keypair::new();
    svm.airdrop(&reviewer1.pubkey(), 10_000_000_000).expect("debe financiar reviewer1");
    let reviewer2 = Keypair::new();
    svm.airdrop(&reviewer2.pubkey(), 10_000_000_000).expect("debe financiar reviewer2");
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("debe financiar contributor");

    let (workspace_pda, bounty_pda, bounty_id) = setup_submitted_bounty_with_reviewers(
        &mut svm,
        &authority,
        302,
        vec![reviewer1.pubkey(), reviewer2.pubkey()],
        &contributor,
    );

    approve_with(&mut svm, &reviewer1, workspace_pda, bounty_pda, bounty_id)
        .expect("el primer revisor debe aprobar");
    approve_with(&mut svm, &reviewer2, workspace_pda, bounty_pda, bounty_id)
        .expect("el segundo revisor debe aprobar");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty.approvals_count, 2);
    // Both bits 0 and 1 must be set.
    assert_ne!(bounty.approvals_mask & (1u8 << 0), 0, "bit 0 should be set");
    assert_ne!(bounty.approvals_mask & (1u8 << 1), 0, "bit 1 should be set");
    assert!(bounty.status == BountyStatus::PreApproved);
    // window_ends_at_ts = CLOCK_UNIX_TIMESTAMP + challenge_window_secs (3600).
    assert_eq!(
        bounty.window_ends_at_ts,
        Some(CLOCK_UNIX_TIMESTAMP + 3600),
        "challenge window should start at clock + 3600"
    );
}

// ── Bitmask correctness with 3 reviewers, non-contiguous approvals ─────────────

#[test]
fn approve_work_bitmask_non_contiguous() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let reviewer0 = Keypair::new();
    svm.airdrop(&reviewer0.pubkey(), 10_000_000_000).expect("financiar r0");
    let reviewer1 = Keypair::new();
    svm.airdrop(&reviewer1.pubkey(), 10_000_000_000).expect("financiar r1");
    let reviewer2 = Keypair::new();
    svm.airdrop(&reviewer2.pubkey(), 10_000_000_000).expect("financiar r2");
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    // Quorum = 2 out of 3 reviewers.
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), 303);
    let mut params = valid_params(303);
    params.reviewers = vec![reviewer0.pubkey(), reviewer1.pubkey(), reviewer2.pubkey()];
    params.quorum_threshold = 2;
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
        [1u8; 32],
        DEADLINE_UNIX_TIMESTAMP,
    );
    send_create_bounty_tx(&mut svm, &sponsor, ix).expect("bounty create");
    let ix = build_submit_work_ix(contributor.pubkey(), workspace_pda, bounty_pda, 0, [2u8; 32]);
    send_submit_work_tx(&mut svm, &contributor, ix).expect("submit work");

    // reviewer0 (bit 0) and reviewer2 (bit 2) approve; reviewer1 (bit 1) does not.
    approve_with(&mut svm, &reviewer0, workspace_pda, bounty_pda, 0).expect("r0 aprueba");
    approve_with(&mut svm, &reviewer2, workspace_pda, bounty_pda, 0).expect("r2 aprueba");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty.approvals_count, 2);
    // Bits 0 and 2 set, bit 1 clear.
    assert_ne!(bounty.approvals_mask & 0b00000001, 0, "bit 0 (r0)");
    assert_eq!(bounty.approvals_mask & 0b00000010, 0, "bit 1 (r1) must be clear");
    assert_ne!(bounty.approvals_mask & 0b00000100, 0, "bit 2 (r2)");
    assert!(bounty.status == BountyStatus::PreApproved);
}

// ── Error: unauthorized reviewer ──────────────────────────────────────────────

#[test]
fn approve_work_fails_for_unauthorized_reviewer() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let reviewer1 = Keypair::new();
    svm.airdrop(&reviewer1.pubkey(), 10_000_000_000).expect("financiar r1");
    let reviewer2 = Keypair::new();
    svm.airdrop(&reviewer2.pubkey(), 10_000_000_000).expect("financiar r2");
    let unauthorized = Keypair::new();
    svm.airdrop(&unauthorized.pubkey(), 10_000_000_000).expect("financiar unauthorized");
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    let (workspace_pda, bounty_pda, bounty_id) = setup_submitted_bounty_with_reviewers(
        &mut svm,
        &authority,
        304,
        vec![reviewer1.pubkey(), reviewer2.pubkey()],
        &contributor,
    );

    let err = approve_with(&mut svm, &unauthorized, workspace_pda, bounty_pda, bounty_id)
        .expect_err("solo reviewers autorizados pueden aprobar");

    let err_msg = &err;
    assert!(
        err_msg.contains("UnauthorizedReviewer") || err_msg.contains("6004"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: duplicate vote from same reviewer ───────────────────────────────────

#[test]
fn approve_work_fails_on_duplicate_action() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let reviewer1 = Keypair::new();
    svm.airdrop(&reviewer1.pubkey(), 10_000_000_000).expect("financiar r1");
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    let (workspace_pda, bounty_pda, bounty_id) = setup_submitted_bounty_with_reviewers(
        &mut svm,
        &authority,
        305,
        vec![reviewer1.pubkey(), Pubkey::new_unique()],
        &contributor,
    );

    approve_with(&mut svm, &reviewer1, workspace_pda, bounty_pda, bounty_id)
        .expect("primera aprobación debe pasar");

    let err = approve_with(&mut svm, &reviewer1, workspace_pda, bounty_pda, bounty_id)
        .expect_err("el mismo revisor no puede aprobar dos veces");

    let err_msg = &err;
    assert!(
        err_msg.contains("DuplicateAction") || err_msg.contains("6012"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: contributor tries to approve their own work ────────────────────────

#[test]
fn approve_work_fails_for_self_approval() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    // The contributor is also listed as a reviewer.
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");
    let other_reviewer = Keypair::new();
    svm.airdrop(&other_reviewer.pubkey(), 10_000_000_000).expect("financiar other_reviewer");

    let (workspace_pda, bounty_pda, bounty_id) = setup_submitted_bounty_with_reviewers(
        &mut svm,
        &authority,
        306,
        vec![contributor.pubkey(), other_reviewer.pubkey()],
        &contributor,
    );

    let err = approve_with(&mut svm, &contributor, workspace_pda, bounty_pda, bounty_id)
        .expect_err("el contributor no puede auto-aprobar");

    let err_msg = &err;
    assert!(
        err_msg.contains("SelfApprovalNotAllowed") || err_msg.contains("6007"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: approve a bounty that is not Submitted ─────────────────────────────

#[test]
fn approve_work_fails_when_not_submitted() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let reviewer1 = Keypair::new();
    svm.airdrop(&reviewer1.pubkey(), 10_000_000_000).expect("financiar r1");
    let reviewer2 = Keypair::new();
    svm.airdrop(&reviewer2.pubkey(), 10_000_000_000).expect("financiar r2");

    // Create Open bounty (not submitted yet).
    let workspace_id = 307_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![reviewer1.pubkey(), reviewer2.pubkey()];
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
        [3u8; 32],
        DEADLINE_UNIX_TIMESTAMP,
    );
    send_create_bounty_tx(&mut svm, &sponsor, ix).expect("bounty create");
    // Bounty is Open, never submitted.

    let err = approve_with(&mut svm, &reviewer1, workspace_pda, bounty_pda, 0)
        .expect_err("no se puede aprobar un bounty Open");

    let err_msg = &err;
    assert!(
        err_msg.contains("InvalidStateTransition") || err_msg.contains("6003"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: workspace paused ────────────────────────────────────────────────────

#[test]
fn approve_work_fails_when_workspace_paused() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let reviewer1 = Keypair::new();
    svm.airdrop(&reviewer1.pubkey(), 10_000_000_000).expect("financiar r1");
    let reviewer2 = Keypair::new();
    svm.airdrop(&reviewer2.pubkey(), 10_000_000_000).expect("financiar r2");
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    let (workspace_pda, bounty_pda, bounty_id) = setup_submitted_bounty_with_reviewers(
        &mut svm,
        &authority,
        308,
        vec![reviewer1.pubkey(), reviewer2.pubkey()],
        &contributor,
    );

    set_workspace_paused(&mut svm, &workspace_pda, true);

    let err = approve_with(&mut svm, &reviewer1, workspace_pda, bounty_pda, bounty_id)
        .expect_err("debe fallar si el workspace está pausado");

    let err_msg = &err;
    assert!(
        err_msg.contains("WorkspacePaused") || err_msg.contains("6000"),
        "unexpected error: {err_msg}"
    );
}
