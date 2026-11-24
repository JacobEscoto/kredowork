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

// ── Setup helper ───────────────────────────────────────────────────────────────

fn setup_open_bounty(
    svm: &mut LiteSVM,
    authority: &Keypair,
    sponsor: &Keypair,
    workspace_id: u64,
) -> (Pubkey, Pubkey, Pubkey, u64) {
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

// ── Happy path: cancel refunds sponsor and marks Cancelled ────────────────────

#[test]
fn cancel_bounty_happy_path() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 501);

    let sponsor_before = lamports(&svm, &sponsor.pubkey());

    let ix = build_cancel_bounty_ix(
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        bounty_id,
    );
    send_instruction(&mut svm, ix, &sponsor, &sponsor.pubkey())
        .expect("cancellation should succeed");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert!(bounty.status == BountyStatus::Cancelled, "status should be Cancelled");
    assert_eq!(bounty.reward_amount, 0, "reward_amount should be 0");
    assert_eq!(bounty.window_ends_at_ts, None);

    // Vault is drained.
    assert_eq!(lamports(&svm, &vault_pda), 0, "vault should be empty");

    // Sponsor receives full refund minus tx fee.
    assert_eq!(
        lamports(&svm, &sponsor.pubkey()),
        sponsor_before + 1_000_000_000 - LITESVM_TX_FEE,
        "sponsor should receive full refund"
    );
}

// ── Error: cancel a non-Open bounty ──────────────────────────────────────────

#[test]
fn cancel_bounty_fails_when_not_open() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 502);

    // First cancel succeeds.
    let ix = build_cancel_bounty_ix(
        sponsor.pubkey(), workspace_pda, bounty_pda, vault_pda, bounty_id,
    );
    send_instruction(&mut svm, ix, &sponsor, &sponsor.pubkey())
        .expect("first cancel should succeed");

    // Second cancel must fail: bounty is now Cancelled.
    let ix = build_cancel_bounty_ix(
        sponsor.pubkey(), workspace_pda, bounty_pda, vault_pda, bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &sponsor, &sponsor.pubkey())
        .expect_err("should fail if bounty is no longer Open");

    let err_msg = &err;
    assert!(
        err_msg.contains("InvalidStateTransition") || err_msg.contains("6003"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: cannot cancel a Submitted bounty ───────────────────────────────────

#[test]
fn cancel_bounty_fails_when_submitted() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("should fund contributor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 503);

    // Submit work → bounty becomes Submitted.
    let ix = build_submit_work_ix(
        contributor.pubkey(), workspace_pda, bounty_pda, bounty_id, [1u8; 32],
    );
    send_submit_work_tx(&mut svm, &contributor, ix).expect("work should be submitted");

    // Sponsor tries to cancel a Submitted bounty – must fail.
    let ix = build_cancel_bounty_ix(
        sponsor.pubkey(), workspace_pda, bounty_pda, vault_pda, bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &sponsor, &sponsor.pubkey())
        .expect_err("cannot cancel a Submitted bounty");

    let err_msg = &err;
    assert!(
        err_msg.contains("InvalidStateTransition") || err_msg.contains("6003"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: non-sponsor tries to cancel ───────────────────────────────────────

#[test]
fn cancel_bounty_fails_for_non_sponsor() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");
    let impostor = Keypair::new();
    svm.airdrop(&impostor.pubkey(), 10_000_000_000).expect("should fund impostor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 504);

    // Build IX with impostor as sponsor (account constraint will reject).
    let ix = build_cancel_bounty_ix(
        impostor.pubkey(), workspace_pda, bounty_pda, vault_pda, bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &impostor, &impostor.pubkey())
        .expect_err("impostor cannot cancel the bounty");

    let err_msg = &err;
    assert!(!err_msg.is_empty(), "should produce an error");
}

// ── Error: workspace paused ────────────────────────────────────────────────────

#[test]
fn cancel_bounty_fails_when_workspace_paused() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 505);

    set_workspace_paused(&mut svm, &workspace_pda, true);

    let ix = build_cancel_bounty_ix(
        sponsor.pubkey(), workspace_pda, bounty_pda, vault_pda, bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &sponsor, &sponsor.pubkey())
        .expect_err("should fail when workspace is paused");

    let err_msg = &err;
    assert!(
        err_msg.contains("WorkspacePaused") || err_msg.contains("6000"),
        "unexpected error: {err_msg}"
    );
}
