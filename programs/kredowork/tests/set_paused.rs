#[path = "common/mod.rs"]
mod common;

use anchor_lang::prelude::Pubkey;
use common::*;
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_signer::Signer;

const CLOCK_UNIX_TIMESTAMP: i64 = 1_700_000_000;
const DEADLINE_UNIX_TIMESTAMP: i64 = 1_700_086_400;

fn setup_workspace(svm: &mut LiteSVM, authority: &Keypair, workspace_id: u64) -> Pubkey {
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let params = valid_params(workspace_id);
    send_initialize_workspace_tx(svm, authority, workspace_pda, params)
        .expect("workspace should be initialized");
    workspace_pda
}

#[test]
fn set_paused_happy_path() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 801_u64;
    let workspace_pda = setup_workspace(&mut svm, &authority, workspace_id);

    // Initial state: not paused.
    let ws = fetch_workspace(&svm, &workspace_pda);
    assert!(!ws.is_paused);

    // Pause the workspace.
    let ix = build_set_paused_ix(authority.pubkey(), workspace_pda, true);
    send_set_paused_tx(&mut svm, &authority, ix).expect("pause instruction should succeed");

    let ws = fetch_workspace(&svm, &workspace_pda);
    assert!(ws.is_paused);

    // Unpause the workspace.
    let ix = build_set_paused_ix(authority.pubkey(), workspace_pda, false);
    send_set_paused_tx(&mut svm, &authority, ix).expect("unpause instruction should succeed");

    let ws = fetch_workspace(&svm, &workspace_pda);
    assert!(!ws.is_paused);
}

#[test]
fn set_paused_fails_for_non_authority() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 802_u64;
    let workspace_pda = setup_workspace(&mut svm, &authority, workspace_id);

    let impostor = Keypair::new();
    svm.airdrop(&impostor.pubkey(), 10_000_000_000).expect("should fund impostor");

    // Impostor attempts to pause workspace.
    let ix = build_set_paused_ix(impostor.pubkey(), workspace_pda, true);
    let err = send_set_paused_tx(&mut svm, &impostor, ix)
        .expect_err("non-authority should not be able to pause");

    assert!(!err.is_empty());
}

#[test]
fn set_paused_blocks_bounty_creation_when_paused() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);
    let workspace_id = 803_u64;
    let workspace_pda = setup_workspace(&mut svm, &authority, workspace_id);

    // Pause via instruction.
    let ix = build_set_paused_ix(authority.pubkey(), workspace_pda, true);
    send_set_paused_tx(&mut svm, &authority, ix).expect("should pause");

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
        [1u8; 32],
        DEADLINE_UNIX_TIMESTAMP,
    );
    let err = send_create_bounty_tx(&mut svm, &sponsor, ix)
        .expect_err("creating bounty in paused workspace should fail");

    assert!(err.contains("WorkspacePaused") || err.contains("6000"));
}
