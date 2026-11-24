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
        .expect("el workspace debe inicializarse");

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
    send_create_bounty_tx(svm, sponsor, ix).expect("el bounty debe crearse");

    (workspace_pda, bounty_pda, vault_pda, 0)
}

// ── Happy path: cancel refunds sponsor and marks Cancelled ────────────────────

#[test]
fn cancel_bounty_happy_path() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("debe financiar el sponsor");

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
        .expect("el cancel debe ejecutarse");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert!(bounty.status == BountyStatus::Cancelled, "estado debe ser Cancelled");
    assert_eq!(bounty.reward_amount, 0, "reward_amount debe quedar 0");
    assert_eq!(bounty.window_ends_at_ts, None);

    // Vault is drained.
    assert_eq!(lamports(&svm, &vault_pda), 0, "vault debe quedar vacío");

    // Sponsor receives full refund minus tx fee.
    assert_eq!(
        lamports(&svm, &sponsor.pubkey()),
        sponsor_before + 1_000_000_000 - LITESVM_TX_FEE,
        "sponsor debe recibir el reembolso completo"
    );
}

// ── Error: cancel a non-Open bounty ──────────────────────────────────────────

#[test]
fn cancel_bounty_fails_when_not_open() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("debe financiar el sponsor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 502);

    // First cancel succeeds.
    let ix = build_cancel_bounty_ix(
        sponsor.pubkey(), workspace_pda, bounty_pda, vault_pda, bounty_id,
    );
    send_instruction(&mut svm, ix, &sponsor, &sponsor.pubkey())
        .expect("el primer cancel debe ejecutarse");

    // Second cancel must fail: bounty is now Cancelled.
    let ix = build_cancel_bounty_ix(
        sponsor.pubkey(), workspace_pda, bounty_pda, vault_pda, bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &sponsor, &sponsor.pubkey())
        .expect_err("debe fallar si el bounty ya no está Open");

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
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 503);

    // Submit work → bounty becomes Submitted.
    let ix = build_submit_work_ix(
        contributor.pubkey(), workspace_pda, bounty_pda, bounty_id, [1u8; 32],
    );
    send_submit_work_tx(&mut svm, &contributor, ix).expect("submit work");

    // Sponsor tries to cancel a Submitted bounty – must fail.
    let ix = build_cancel_bounty_ix(
        sponsor.pubkey(), workspace_pda, bounty_pda, vault_pda, bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &sponsor, &sponsor.pubkey())
        .expect_err("no se puede cancelar un bounty Submitted");

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
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");
    let impostor = Keypair::new();
    svm.airdrop(&impostor.pubkey(), 10_000_000_000).expect("financiar impostor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 504);

    // Build IX with impostor as sponsor (account constraint will reject).
    let ix = build_cancel_bounty_ix(
        impostor.pubkey(), workspace_pda, bounty_pda, vault_pda, bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &impostor, &impostor.pubkey())
        .expect_err("un impostor no puede cancelar el bounty");

    let err_msg = &err;
    assert!(!err_msg.is_empty(), "debe producir un error");
}

// ── Error: workspace paused ────────────────────────────────────────────────────

#[test]
fn cancel_bounty_fails_when_workspace_paused() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 505);

    set_workspace_paused(&mut svm, &workspace_pda, true);

    let ix = build_cancel_bounty_ix(
        sponsor.pubkey(), workspace_pda, bounty_pda, vault_pda, bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &sponsor, &sponsor.pubkey())
        .expect_err("debe fallar si el workspace está pausado");

    let err_msg = &err;
    assert!(
        err_msg.contains("WorkspacePaused") || err_msg.contains("6000"),
        "unexpected error: {err_msg}"
    );
}
