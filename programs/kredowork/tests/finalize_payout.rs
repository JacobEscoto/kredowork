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
const REWARD_AMOUNT: u64 = 1_000_000_000;
const FEE_BPS: u16 = 250;

// ── Setup helper: creates a PreApproved bounty ─────────────────────────────────

fn setup_preapproved_bounty(
    svm: &mut LiteSVM,
    authority: &Keypair,
    workspace_id: u64,
    contributor: &Keypair,
) -> (Pubkey, Pubkey, Pubkey, u64) {
    let reviewer1 = Keypair::new();
    svm.airdrop(&reviewer1.pubkey(), 10_000_000_000).expect("financiar r1");
    let reviewer2 = Keypair::new();
    svm.airdrop(&reviewer2.pubkey(), 10_000_000_000).expect("financiar r2");

    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![reviewer1.pubkey(), reviewer2.pubkey()];
    send_initialize_workspace_tx(svm, authority, workspace_pda, params).expect("workspace init");

    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");
    let (bounty_pda, _) = derive_bounty_pda(&workspace_pda, 0);
    let (vault_pda, _) = derive_vault_pda(&bounty_pda);
    let ix = build_create_bounty_ix(
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        REWARD_AMOUNT,
        [9u8; 32],
        DEADLINE_UNIX_TIMESTAMP,
    );
    send_create_bounty_tx(svm, &sponsor, ix).expect("bounty create");

    let ix = build_submit_work_ix(contributor.pubkey(), workspace_pda, bounty_pda, 0, DELIVERY_HASH);
    send_submit_work_tx(svm, contributor, ix).expect("submit work");

    let ix = build_approve_work_ix(reviewer1.pubkey(), workspace_pda, bounty_pda, 0);
    send_approve_work_tx(svm, &reviewer1, ix).expect("r1 approve");
    let ix = build_approve_work_ix(reviewer2.pubkey(), workspace_pda, bounty_pda, 0);
    send_approve_work_tx(svm, &reviewer2, ix).expect("r2 approve");

    (workspace_pda, bounty_pda, vault_pda, 0)
}

// ── Happy path: full payout with fee split ────────────────────────────────────

#[test]
fn finalize_payout_happy_path() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_preapproved_bounty(&mut svm, &authority, 401, &contributor);

    // Advance clock to >= window_ends_at_ts (CLOCK_UNIX_TIMESTAMP + 3600).
    let bounty = fetch_bounty(&svm, &bounty_pda);
    let window_ends = bounty.window_ends_at_ts.expect("debe existir la window");
    set_sysvar_clock(&mut svm, window_ends);

    let contributor_before = lamports(&svm, &contributor.pubkey());
    let authority_before = lamports(&svm, &authority.pubkey());

    let ix = build_finalize_payout_ix(
        authority.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        contributor.pubkey(),
        authority.pubkey(),
        bounty_id,
    );
    send_instruction(&mut svm, ix, &authority, &authority.pubkey())
        .expect("el payout debe ejecutarse");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert!(bounty.status == BountyStatus::Completed, "estado debe ser Completed");
    assert_eq!(bounty.reward_amount, 0, "reward_amount debe quedar 0");
    assert_eq!(bounty.window_ends_at_ts, None);

    let fee_amount = REWARD_AMOUNT * u64::from(FEE_BPS) / 10_000;
    let payout_amount = REWARD_AMOUNT - fee_amount;

    // Vault must be drained.
    assert_eq!(lamports(&svm, &vault_pda), 0, "vault debe quedar vacío");

    // Contributor receives net payout.
    assert_eq!(
        lamports(&svm, &contributor.pubkey()),
        contributor_before + payout_amount,
        "contributor debe recibir payout_amount"
    );

    // Authority (fee_recipient) receives the fee minus tx fee paid.
    let authority_after = lamports(&svm, &authority.pubkey());
    // authority paid the tx fee but received fee_amount.
    assert_eq!(
        authority_after,
        authority_before + fee_amount - LITESVM_TX_FEE,
        "authority debe recibir fee_amount neto de tx_fee"
    );
}

// ── Happy path: zero fee (fee_bps = 0) ────────────────────────────────────────

#[test]
fn finalize_payout_zero_fee() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let reviewer1 = Keypair::new();
    svm.airdrop(&reviewer1.pubkey(), 10_000_000_000).expect("financiar r1");
    let reviewer2 = Keypair::new();
    svm.airdrop(&reviewer2.pubkey(), 10_000_000_000).expect("financiar r2");
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    let workspace_id = 402_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.fee_bps = 0;
    params.reviewers = vec![reviewer1.pubkey(), reviewer2.pubkey()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params)
        .expect("workspace init");

    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");
    let (bounty_pda, _) = derive_bounty_pda(&workspace_pda, 0);
    let (vault_pda, _) = derive_vault_pda(&bounty_pda);
    let ix = build_create_bounty_ix(
        sponsor.pubkey(), workspace_pda, bounty_pda, vault_pda,
        REWARD_AMOUNT, [9u8; 32], DEADLINE_UNIX_TIMESTAMP,
    );
    send_create_bounty_tx(&mut svm, &sponsor, ix).expect("bounty create");

    let ix = build_submit_work_ix(contributor.pubkey(), workspace_pda, bounty_pda, 0, DELIVERY_HASH);
    send_submit_work_tx(&mut svm, &contributor, ix).expect("submit work");

    let ix = build_approve_work_ix(reviewer1.pubkey(), workspace_pda, bounty_pda, 0);
    send_approve_work_tx(&mut svm, &reviewer1, ix).expect("r1 approve");
    let ix = build_approve_work_ix(reviewer2.pubkey(), workspace_pda, bounty_pda, 0);
    send_approve_work_tx(&mut svm, &reviewer2, ix).expect("r2 approve");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    let window_ends = bounty.window_ends_at_ts.unwrap();
    set_sysvar_clock(&mut svm, window_ends);

    let contributor_before = lamports(&svm, &contributor.pubkey());

    let ix = build_finalize_payout_ix(
        authority.pubkey(), workspace_pda, bounty_pda, vault_pda,
        contributor.pubkey(), authority.pubkey(), 0,
    );
    send_instruction(&mut svm, ix, &authority, &authority.pubkey()).expect("payout ejecutado");

    // With fee_bps = 0 contributor should receive full REWARD_AMOUNT.
    assert_eq!(
        lamports(&svm, &contributor.pubkey()),
        contributor_before + REWARD_AMOUNT,
    );
    assert_eq!(lamports(&svm, &vault_pda), 0);
}

// ── Error: finalize before challenge window expires ───────────────────────────

#[test]
fn finalize_payout_fails_before_window_expires() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_preapproved_bounty(&mut svm, &authority, 403, &contributor);

    // Clock is still at CLOCK_UNIX_TIMESTAMP; window ends at CLOCK_UNIX_TIMESTAMP + 3600.
    let ix = build_finalize_payout_ix(
        authority.pubkey(), workspace_pda, bounty_pda, vault_pda,
        contributor.pubkey(), authority.pubkey(), bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &authority, &authority.pubkey())
        .expect_err("debe fallar si la window no venció");

    let err_msg = &err;
    assert!(
        err_msg.contains("WindowNotExpired") || err_msg.contains("6009"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: bounty not in PreApproved state ────────────────────────────────────

#[test]
fn finalize_payout_fails_when_bounty_not_preapproved() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("financiar sponsor");
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    let workspace_id = 404_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![Pubkey::new_unique(), Pubkey::new_unique()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params).expect("workspace init");

    let (bounty_pda, _) = derive_bounty_pda(&workspace_pda, 0);
    let (vault_pda, _) = derive_vault_pda(&bounty_pda);
    let ix = build_create_bounty_ix(
        sponsor.pubkey(), workspace_pda, bounty_pda, vault_pda,
        REWARD_AMOUNT, [9u8; 32], DEADLINE_UNIX_TIMESTAMP,
    );
    send_create_bounty_tx(&mut svm, &sponsor, ix).expect("bounty create");
    // Bounty is Open (not submitted, not approved).

    let ix = build_finalize_payout_ix(
        authority.pubkey(), workspace_pda, bounty_pda, vault_pda,
        contributor.pubkey(), authority.pubkey(), 0,
    );
    let err = send_instruction(&mut svm, ix, &authority, &authority.pubkey())
        .expect_err("debe fallar si el bounty no está en PreApproved");

    let err_msg = &err;
    assert!(
        err_msg.contains("InvalidStateTransition") || err_msg.contains("6003"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: wrong contributor (mismatched claimant) ────────────────────────────

#[test]
fn finalize_payout_fails_for_wrong_contributor() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");
    let impostor = Keypair::new();
    svm.airdrop(&impostor.pubkey(), 10_000_000_000).expect("financiar impostor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_preapproved_bounty(&mut svm, &authority, 405, &contributor);

    let bounty = fetch_bounty(&svm, &bounty_pda);
    let window_ends = bounty.window_ends_at_ts.unwrap();
    set_sysvar_clock(&mut svm, window_ends);

    // Pass impostor's pubkey instead of the real contributor.
    let ix = build_finalize_payout_ix(
        authority.pubkey(), workspace_pda, bounty_pda, vault_pda,
        impostor.pubkey(), authority.pubkey(), bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &authority, &authority.pubkey())
        .expect_err("debe fallar si el contributor no es el claimant");

    let err_msg = &err;
    assert!(
        err_msg.contains("SelfApprovalNotAllowed")
            || err_msg.contains("6007")
            || err_msg.contains("ConstraintAddress")
            || err_msg.contains("2006"),
        "unexpected error: {err_msg}"
    );
}

// ── Error: workspace paused ────────────────────────────────────────────────────

#[test]
fn finalize_payout_fails_when_workspace_paused() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let contributor = Keypair::new();
    svm.airdrop(&contributor.pubkey(), 10_000_000_000).expect("financiar contributor");

    let (workspace_pda, bounty_pda, vault_pda, bounty_id) =
        setup_preapproved_bounty(&mut svm, &authority, 406, &contributor);

    let bounty = fetch_bounty(&svm, &bounty_pda);
    let window_ends = bounty.window_ends_at_ts.unwrap();
    set_sysvar_clock(&mut svm, window_ends);

    set_workspace_paused(&mut svm, &workspace_pda, true);

    let ix = build_finalize_payout_ix(
        authority.pubkey(), workspace_pda, bounty_pda, vault_pda,
        contributor.pubkey(), authority.pubkey(), bounty_id,
    );
    let err = send_instruction(&mut svm, ix, &authority, &authority.pubkey())
        .expect_err("debe fallar si el workspace está pausado");

    let err_msg = &err;
    assert!(
        err_msg.contains("WorkspacePaused") || err_msg.contains("6000"),
        "unexpected error: {err_msg}"
    );
}
