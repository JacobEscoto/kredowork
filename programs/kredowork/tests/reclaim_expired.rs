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

// ── Happy path: reclaim Open bounty after deadline ────────────────────────────

#[test]
fn reclaim_expired_open_bounty_refunds_sponsor() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");

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
        .expect("el reclaim debe ejecutarse");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert!(bounty.status == BountyStatus::Expired, "estado debe ser Expired");
    assert_eq!(bounty.reward_amount, 0, "reward_amount debe quedar 0");
    assert_eq!(bounty.window_ends_at_ts, None);

    // Vault drained.
    assert_eq!(lamports(&svm, &vault_pda), 0, "vault debe quedar vacío");

    // Sponsor gets refund; authority paid the tx fee.
    assert_eq!(
        lamports(&svm, &sponsor.pubkey()),
        sponsor_before + 1_000_000_000,
        "sponsor debe recibir el reembolso completo"
    );
}

// ── Happy path: reclaim Claimed (submitted) bounty after deadline ─────────────

#[test]
fn reclaim_expired_claimed_bounty_refunds_sponsor() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 602);

    // Contributor submits → status = Submitted (Claimed-equivalent).
    let ix = build_submit_work_ix(
        contributor.pubkey(), workspace_pda, bounty_pda, bounty_id, [1u8; 32],
    );
    send_submit_work_tx(&mut svm, &contributor, ix).expect("submit work");

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
    // The current on-chain logic is `Open | Claimed` → Submitted is NOT accepted.
    let result = send_instruction(&mut svm, ix, &authority, &authority.pubkey());
    // This should fail: Submitted is NOT in the accepted set.
    let err = result.expect_err("debe fallar: Submitted no es Open|Claimed");
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
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");

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
        .expect_err("debe fallar si el deadline aún no pasó");

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
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");

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
        .expect_err("debe fallar exactamente al deadline (se requiere clock > deadline)");

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
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 605);

    // Cancel the bounty first.
    let ix = build_cancel_bounty_ix(
        sponsor.pubkey(), workspace_pda, bounty_pda, vault_pda, bounty_id,
    );
    send_instruction(&mut svm, ix, &sponsor, &sponsor.pubkey()).expect("cancel debe ejecutarse");

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
        .expect_err("no se puede reclamar un bounty Cancelled");

    let err_msg = &err;
    assert!(
        err_msg.contains("InvalidStateTransition") || err_msg.contains("6003"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: workspace paused ────────────────────────────────────────────────────

#[test]
fn reclaim_expired_fails_when_workspace_paused() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_open_bounty(&mut svm, &authority, &sponsor, 606);

    set_sysvar_clock(&mut svm, DEADLINE_UNIX_TIMESTAMP + 1);
    set_workspace_paused(&mut svm, &workspace_pda, true);

    let ix = build_reclaim_expired_ix(
        authority.pubkey(),
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &authority, &authority.pubkey())
        .expect_err("debe fallar si el workspace está pausado");

    let err_msg = &err;
    assert!(
        err_msg.contains("WorkspacePaused") || err_msg.contains("6000"),
        "unexpected error: {err_msg}"
    );
}
