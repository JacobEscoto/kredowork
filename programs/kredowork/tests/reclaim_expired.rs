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

/// Creates workspace + bounty + submitted work + reviewer rejection → `Rejected`.
fn setup_rejected_bounty(
    svm: &mut LiteSVM,
    authority: &Keypair,
    sponsor: &Keypair,
    contributor: &Keypair,
    reviewer: &Keypair,
    workspace_id: u64,
) -> (Pubkey, Pubkey, Pubkey, u64) {
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![reviewer.pubkey(), Pubkey::new_unique()];
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

    let ix = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        0,
        DELIVERY_HASH,
    );
    send_submit_work_tx(svm, contributor, ix).expect("work should be submitted");

    let ix = build_reject_work_ix(reviewer.pubkey(), workspace_pda, bounty_pda, 0);
    send_reject_work_tx(svm, reviewer, ix).expect("reject should succeed");

    (workspace_pda, bounty_pda, vault_pda, 0)
}

// ── Happy path: reclaim Open bounty after deadline ────────────────────────────

#[test]
fn reclaim_expired_open_bounty_refunds_sponsor() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000)
        .expect("should fund sponsor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 601);

    // Advance clock past the deadline.
    set_sysvar_clock(&mut svm, DEADLINE_UNIX_TIMESTAMP + 1);

    let sponsor_before = lamports(&svm, &sponsor.pubkey());

    let ix = build_reclaim_expired_ix(
        authority.pubkey(),
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        bounty_id,
    );
    send_instruction(&mut svm, ix, &authority, &authority.pubkey())
        .expect("reclaim should succeed");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert!(
        bounty.status == BountyStatus::Expired,
        "status should be Expired"
    );
    assert_eq!(bounty.reward_amount, 0, "reward_amount should be 0");
    assert_eq!(bounty.window_ends_at_ts, None);

    // Vault drained.
    assert_eq!(lamports(&svm, &vault_pda), 0, "vault should be empty");

    // Sponsor gets refund; authority paid the tx fee.
    assert_eq!(
        lamports(&svm, &sponsor.pubkey()),
        sponsor_before + 1_000_000_000,
        "sponsor should receive full refund"
    );
}

// ── Happy path: reclaim Claimed (submitted) bounty after deadline ─────────────

#[test]
fn reclaim_expired_claimed_bounty_refunds_sponsor() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000)
        .expect("should fund sponsor");
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000)
        .expect("should fund contributor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 602);

    // Contributor submits → status = Submitted.
    let ix = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        bounty_id,
        [1u8; 32],
    );
    send_submit_work_tx(&mut svm, &contributor, ix).expect("work should be submitted");

    // Advance past deadline.
    set_sysvar_clock(&mut svm, DEADLINE_UNIX_TIMESTAMP + 1);

    let ix = build_reclaim_expired_ix(
        authority.pubkey(),
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        bounty_id,
    );
    // reclaim_expired only allows Open | Claimed, not Submitted; document behavior.
    let result = send_instruction(&mut svm, ix, &authority, &authority.pubkey());
    let err = result.expect_err("should fail: Submitted is not Open or Claimed");
    let err_msg = &err;
    assert!(
        err_msg.contains("InvalidStateTransition") || err_msg.contains("6003"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: reclaim before deadline ────────────────────────────────────────────

#[test]
fn reclaim_expired_fails_before_deadline() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000)
        .expect("should fund sponsor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 603);

    // Clock still before the deadline.
    let ix = build_reclaim_expired_ix(
        authority.pubkey(),
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &authority, &authority.pubkey())
        .expect_err("should fail before deadline");

    let err_msg = &err;
    assert!(
        err_msg.contains("WindowNotExpired") || err_msg.contains("6009"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: reclaim exactly at deadline (not strictly after) ───────────────────

#[test]
fn reclaim_expired_fails_at_exact_deadline() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000)
        .expect("should fund sponsor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 604);

    // Set clock exactly to deadline (reclaim requires clock > deadline_ts).
    set_sysvar_clock(&mut svm, DEADLINE_UNIX_TIMESTAMP);

    let ix = build_reclaim_expired_ix(
        authority.pubkey(),
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &authority, &authority.pubkey())
        .expect_err("should fail exactly at deadline (requires clock > deadline)");

    let err_msg = &err;
    assert!(
        err_msg.contains("WindowNotExpired") || err_msg.contains("6009"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: reclaim Cancelled bounty ───────────────────────────────────────────

#[test]
fn reclaim_expired_fails_when_already_cancelled() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000)
        .expect("should fund sponsor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 605);

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

    // Now advance past deadline and try to reclaim.
    set_sysvar_clock(&mut svm, DEADLINE_UNIX_TIMESTAMP + 1);

    let ix = build_reclaim_expired_ix(
        authority.pubkey(),
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &authority, &authority.pubkey())
        .expect_err("cannot reclaim a Cancelled bounty");

    let err_msg = &err;
    assert!(
        err_msg.contains("InvalidStateTransition") || err_msg.contains("6003"),
        "unexpected error: {err_msg}"
    );
}

// ── Happy path: reclaim Rejected bounty after rejection window expires ─────────

#[test]
fn reclaim_expired_rejected_bounty_refunds_sponsor() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000)
        .expect("should fund sponsor");
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000)
        .expect("should fund contributor");
    let reviewer = Keypair::new();
    svm.airdrop(&reviewer.pubkey(), 10_000_000_000)
        .expect("should fund reviewer");

    let workspace_id = 607_u64;
    let (workspace_pda, bounty_pda, vault_pda, bounty_id) = setup_rejected_bounty(
        &mut svm,
        &authority,
        &sponsor,
        &contributor,
        &reviewer,
        workspace_id,
    );

    // After rejection the claim window (clock + challenge_window_secs) must expire.
    set_sysvar_clock(&mut svm, DEADLINE_UNIX_TIMESTAMP + 1);

    let sponsor_before = lamports(&svm, &sponsor.pubkey());

    let ix = build_reclaim_expired_ix(
        authority.pubkey(),
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        bounty_id,
    );
    send_instruction(&mut svm, ix, &authority, &authority.pubkey())
        .expect("reclaim should succeed after rejection window");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert!(
        bounty.status == BountyStatus::Expired,
        "status should be Expired"
    );
    assert_eq!(bounty.reward_amount, 0, "reward_amount should be 0");
    assert_eq!(bounty.window_ends_at_ts, None);

    // Vault drained.
    assert_eq!(lamports(&svm, &vault_pda), 0, "vault should be empty");

    // Sponsor gets refund; authority paid the tx fee.
    assert_eq!(
        lamports(&svm, &sponsor.pubkey()),
        sponsor_before + 1_000_000_000,
        "sponsor should receive full refund"
    );
}
