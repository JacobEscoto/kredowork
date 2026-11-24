#[path = "common/mod.rs"]
mod common;

use anchor_lang::prelude::Pubkey;
use common::*;
use kredowork::state::BountyStatus;
use solana_keypair::Keypair;
use solana_signer::Signer;

const CLOCK_UNIX_TIMESTAMP: i64 = 1_700_000_000;
const DEADLINE_UNIX_TIMESTAMP: i64 = 1_700_086_400;
const REWARD_AMOUNT: u64 = 1_000_000_000;
const SPEC_HASH: [u8; 32] = [42u8; 32];

#[test]
fn create_bounty_happy_path() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let workspace_id = 101_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![Pubkey::new_unique(), Pubkey::new_unique()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params)
        .expect("workspace should be initialized");

    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");

    let bounty_id: u64 = 0;
    let (bounty_pda, bounty_bump) = derive_bounty_pda(&workspace_pda, bounty_id);
    let (vault_pda, vault_bump) = derive_vault_pda(&bounty_pda);

    let sponsor_balance_before = svm.get_balance(&sponsor.pubkey()).expect("sponsor funded");

    let ix = build_create_bounty_ix(
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        REWARD_AMOUNT,
        SPEC_HASH,
        DEADLINE_UNIX_TIMESTAMP,
    );
    send_create_bounty_tx(&mut svm, &sponsor, ix).expect("bounty should be created");

    let sponsor_balance_after = svm.get_balance(&sponsor.pubkey()).expect("sponsor funded");
    let bounty_rent = svm.get_balance(&bounty_pda).expect("bounty funded with rent");
    assert_eq!(
        sponsor_balance_after,
        sponsor_balance_before - REWARD_AMOUNT - LITESVM_TX_FEE - bounty_rent
    );

    let workspace = fetch_workspace(&svm, &workspace_pda);
    assert_eq!(workspace.bounty_count, 1);

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty.bounty_id, bounty_id);
    assert_eq!(bounty.sponsor, sponsor.pubkey());
    assert_eq!(bounty.claimant, None);
    assert_eq!(bounty.reward_amount, REWARD_AMOUNT);
    assert_eq!(bounty.spec_hash, SPEC_HASH);
    assert_eq!(bounty.deadline_ts, DEADLINE_UNIX_TIMESTAMP);
    assert!(bounty.status == BountyStatus::Open);
    assert_eq!(bounty.locked_bond, 0);
    assert_eq!(bounty.approvals_count, 0);
    assert_eq!(bounty.submitted_at_ts, None);
    assert_eq!(bounty.window_ends_at_ts, None);
    assert_eq!(bounty.bump, bounty_bump);
    assert_eq!(bounty.vault_bump, vault_bump);

    assert_eq!(svm.get_balance(&vault_pda), Some(REWARD_AMOUNT));
}

#[test]
fn create_bounty_fails_when_reward_amount_is_zero() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let workspace_id = 102_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![Pubkey::new_unique(), Pubkey::new_unique()];
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
        0,
        SPEC_HASH,
        DEADLINE_UNIX_TIMESTAMP,
    );
    let err = send_create_bounty_tx(&mut svm, &sponsor, ix)
        .expect_err("should fail when reward_amount is zero");

    let err_msg = &err;
    assert!(
        err_msg.contains("InvalidRewardAmount") || err_msg.contains("6001"),
        "unexpected error: {err_msg}"
    );
}

#[test]
fn create_bounty_fails_when_deadline_is_in_the_past() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let workspace_id = 103_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![Pubkey::new_unique(), Pubkey::new_unique()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params)
        .expect("workspace should be initialized");

    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");

    let (bounty_pda, _) = derive_bounty_pda(&workspace_pda, 0);
    let (vault_pda, _) = derive_vault_pda(&bounty_pda);

    let past_deadline = CLOCK_UNIX_TIMESTAMP - 1;
    let ix = build_create_bounty_ix(
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        REWARD_AMOUNT,
        SPEC_HASH,
        past_deadline,
    );
    let err = send_create_bounty_tx(&mut svm, &sponsor, ix)
        .expect_err("should fail when deadline is in the past");

    let err_msg = &err;
    assert!(
        err_msg.contains("InvalidDeadline") || err_msg.contains("6002"),
        "unexpected error: {err_msg}"
    );
}

#[test]
fn create_bounty_fails_when_workspace_is_paused() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let workspace_id = 104_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![Pubkey::new_unique(), Pubkey::new_unique()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params)
        .expect("workspace should be initialized");

    let sponsor = Keypair::new();
    svm.airdrop(&sponsor.pubkey(), 10_000_000_000).expect("should fund sponsor");

    let (bounty_pda, _) = derive_bounty_pda(&workspace_pda, 0);
    let (vault_pda, _) = derive_vault_pda(&bounty_pda);

    set_workspace_paused(&mut svm, &workspace_pda, true);

    let ix = build_create_bounty_ix(
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        REWARD_AMOUNT,
        SPEC_HASH,
        DEADLINE_UNIX_TIMESTAMP,
    );
    let err = send_create_bounty_tx(&mut svm, &sponsor, ix)
        .expect_err("should fail when workspace is paused");

    let err_msg = &err;
    assert!(
        err_msg.contains("WorkspacePaused") || err_msg.contains("6000"),
        "unexpected error: {err_msg}"
    );
}
