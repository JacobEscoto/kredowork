#![allow(dead_code)]

use std::path::PathBuf;

use anchor_lang::{prelude::*, InstructionData, ToAccountMetas};
use kredowork::{
    constants::{BOUNTY_SEED, VAULT_SEED, WORKSPACE_SEED},
    instructions::{
        initialize_workspace::WorkspaceParams, update_workspace::UpdateWorkspaceParams,
    },
    state::{BountyAccount, WorkspaceConfig},
    ID as PROGRAM_ID,
};
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::{Instruction, Transaction};

pub const PROGRAM_SO_ENV: &str = "KREDOWORK_PROGRAM_SO";

/// Signature fee that LiteSVM deducts from transaction payers.
pub const LITESVM_TX_FEE: u64 = 5_000;

pub fn program_so_path() -> PathBuf {
    std::env::var_os(PROGRAM_SO_ENV)
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../target/deploy/kredowork.so")
        })
}

pub fn setup_svm_with_program() -> (LiteSVM, Keypair) {
    let mut svm = LiteSVM::new();
    let authority = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000)
        .expect("should fund the authority");

    let program_path = program_so_path();
    svm.add_program_from_file(PROGRAM_ID, &program_path)
        .unwrap_or_else(|e| {
            panic!(
                "could not load {}: {e}. Run `anchor build` or define {PROGRAM_SO_ENV} with the path to the .so file",
                program_path.display()
            )
        });

    (svm, authority)
}

pub fn set_sysvar_clock(svm: &mut LiteSVM, unix_timestamp: i64) {
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = unix_timestamp;
    svm.set_sysvar(&clock);
}

pub fn derive_workspace_pda(authority: &Pubkey, workspace_id: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            WORKSPACE_SEED,
            authority.as_ref(),
            &workspace_id.to_le_bytes(),
        ],
        &PROGRAM_ID,
    )
}

pub fn derive_bounty_pda(workspace_key: &Pubkey, bounty_id: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            BOUNTY_SEED,
            workspace_key.as_ref(),
            &bounty_id.to_le_bytes(),
        ],
        &PROGRAM_ID,
    )
}

pub fn derive_vault_pda(bounty_key: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[VAULT_SEED, bounty_key.as_ref()], &PROGRAM_ID)
}

pub fn valid_params(workspace_id: u64) -> WorkspaceParams {
    WorkspaceParams {
        workspace_id,
        quorum_threshold: 2,
        max_submission_attempts: 3,
        challenge_window_secs: 3600,
        review_timeout_secs: 7200,
        fee_bps: 250,
        bond_bps: 1000,
        reviewers: vec![Pubkey::new_unique(), Pubkey::new_unique()],
    }
}

pub fn send_instruction(
    svm: &mut LiteSVM,
    ix: Instruction,
    signing_key: &Keypair,
    payer: &Pubkey,
) -> std::result::Result<(), String> {
    // Each transaction requires a fresh blockhash to generate a unique signature.
    svm.expire_blockhash();
    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(payer),
        &[signing_key],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx)
        .map(|_| ())
        .map_err(|e| format!("{e:?}"))
}

pub fn build_initialize_workspace_ix(
    authority: Pubkey,
    workspace_pda: Pubkey,
    params: WorkspaceParams,
) -> Instruction {
    let accounts = kredowork::accounts::InitializeWorkspace {
        workspace: workspace_pda,
        authority,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    let data = kredowork::instruction::InitializeWorkspace { params }.data();

    Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    }
}

pub fn send_initialize_workspace_tx(
    svm: &mut LiteSVM,
    authority: &Keypair,
    workspace_pda: Pubkey,
    params: WorkspaceParams,
) -> std::result::Result<(), String> {
    let ix = build_initialize_workspace_ix(authority.pubkey(), workspace_pda, params);
    send_instruction(svm, ix, authority, &authority.pubkey())
}

pub fn build_create_bounty_ix(
    sponsor: Pubkey,
    workspace_pda: Pubkey,
    bounty_pda: Pubkey,
    vault_pda: Pubkey,
    reward_amount: u64,
    spec_hash: [u8; 32],
    deadline_ts: i64,
) -> Instruction {
    let accounts = kredowork::accounts::CreateBounty {
        workspace: workspace_pda,
        bounty: bounty_pda,
        vault: vault_pda,
        sponsor,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    let data = kredowork::instruction::CreateBounty {
        reward_amount,
        spec_hash,
        deadline_ts,
    }
    .data();

    Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    }
}

pub fn send_create_bounty_tx(
    svm: &mut LiteSVM,
    sponsor: &Keypair,
    ix: Instruction,
) -> std::result::Result<(), String> {
    send_instruction(svm, ix, sponsor, &sponsor.pubkey())
}

pub fn build_submit_work_ix(
    contributor: Pubkey,
    workspace_pda: Pubkey,
    bounty_pda: Pubkey,
    bounty_id: u64,
    delivery_hash: [u8; 32],
) -> Instruction {
    let accounts = kredowork::accounts::SubmitWork {
        workspace: workspace_pda,
        bounty: bounty_pda,
        contributor,
    }
    .to_account_metas(None);

    let data = kredowork::instruction::SubmitWork {
        bounty_id,
        delivery_hash,
    }
    .data();

    Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    }
}

pub fn send_submit_work_tx(
    svm: &mut LiteSVM,
    contributor: &Keypair,
    ix: Instruction,
) -> std::result::Result<(), String> {
    send_instruction(svm, ix, contributor, &contributor.pubkey())
}

pub fn build_approve_work_ix(
    reviewer: Pubkey,
    workspace_pda: Pubkey,
    bounty_pda: Pubkey,
    bounty_id: u64,
) -> Instruction {
    let accounts = kredowork::accounts::ApproveWork {
        workspace: workspace_pda,
        bounty: bounty_pda,
        reviewer,
    }
    .to_account_metas(None);

    let data = kredowork::instruction::ApproveWork { bounty_id }.data();

    Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    }
}

pub fn send_approve_work_tx(
    svm: &mut LiteSVM,
    reviewer: &Keypair,
    ix: Instruction,
) -> std::result::Result<(), String> {
    send_instruction(svm, ix, reviewer, &reviewer.pubkey())
}

pub fn build_finalize_payout_ix(
    caller: Pubkey,
    workspace_pda: Pubkey,
    bounty_pda: Pubkey,
    vault_pda: Pubkey,
    contributor: Pubkey,
    fee_recipient: Pubkey,
    bounty_id: u64,
) -> Instruction {
    let accounts = kredowork::accounts::FinalizePayout {
        workspace: workspace_pda,
        bounty: bounty_pda,
        vault: vault_pda,
        contributor,
        fee_recipient,
        caller,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    let data = kredowork::instruction::FinalizePayout { bounty_id }.data();

    Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    }
}

pub fn build_cancel_bounty_ix(
    sponsor: Pubkey,
    workspace_pda: Pubkey,
    bounty_pda: Pubkey,
    vault_pda: Pubkey,
    bounty_id: u64,
) -> Instruction {
    let accounts = kredowork::accounts::CancelBounty {
        workspace: workspace_pda,
        bounty: bounty_pda,
        vault: vault_pda,
        sponsor,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    let data = kredowork::instruction::CancelBounty { bounty_id }.data();

    Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    }
}

pub fn build_reclaim_expired_ix(
    caller: Pubkey,
    sponsor: Pubkey,
    workspace_pda: Pubkey,
    bounty_pda: Pubkey,
    vault_pda: Pubkey,
    bounty_id: u64,
) -> Instruction {
    let accounts = kredowork::accounts::ReclaimExpired {
        workspace: workspace_pda,
        bounty: bounty_pda,
        vault: vault_pda,
        sponsor,
        caller,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    let data = kredowork::instruction::ReclaimExpired { bounty_id }.data();

    Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    }
}

pub fn build_reject_work_ix(
    reviewer: Pubkey,
    workspace_pda: Pubkey,
    bounty_pda: Pubkey,
    bounty_id: u64,
) -> Instruction {
    let accounts = kredowork::accounts::RejectWork {
        workspace: workspace_pda,
        bounty: bounty_pda,
        reviewer,
    }
    .to_account_metas(None);

    let data = kredowork::instruction::RejectWork { bounty_id }.data();

    Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    }
}

pub fn send_reject_work_tx(
    svm: &mut LiteSVM,
    reviewer: &Keypair,
    ix: Instruction,
) -> std::result::Result<(), String> {
    send_instruction(svm, ix, reviewer, &reviewer.pubkey())
}

pub fn build_set_paused_ix(
    authority: Pubkey,
    workspace_pda: Pubkey,
    is_paused: bool,
) -> Instruction {
    let accounts = kredowork::accounts::SetPaused {
        workspace: workspace_pda,
        authority,
    }
    .to_account_metas(None);

    let data = kredowork::instruction::SetPaused { is_paused }.data();

    Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    }
}

pub fn send_set_paused_tx(
    svm: &mut LiteSVM,
    authority: &Keypair,
    ix: Instruction,
) -> std::result::Result<(), String> {
    send_instruction(svm, ix, authority, &authority.pubkey())
}

pub fn build_update_workspace_ix(
    authority: Pubkey,
    workspace_pda: Pubkey,
    params: UpdateWorkspaceParams,
) -> Instruction {
    let accounts = kredowork::accounts::UpdateWorkspace {
        workspace: workspace_pda,
        authority,
    }
    .to_account_metas(None);

    let data = kredowork::instruction::UpdateWorkspace { params }.data();

    Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    }
}

pub fn send_update_workspace_tx(
    svm: &mut LiteSVM,
    authority: &Keypair,
    ix: Instruction,
) -> std::result::Result<(), String> {
    send_instruction(svm, ix, authority, &authority.pubkey())
}

pub fn fetch_workspace(svm: &LiteSVM, address: &Pubkey) -> WorkspaceConfig {
    let account = svm.get_account(address).expect("the workspace must exist");
    let mut data_slice: &[u8] = &account.data;
    WorkspaceConfig::try_deserialize(&mut data_slice).expect("WorkspaceConfig must be deserialized")
}

pub fn fetch_bounty(svm: &LiteSVM, address: &Pubkey) -> BountyAccount {
    let account = svm.get_account(address).expect("the bounty must exist");
    let mut data_slice: &[u8] = &account.data;
    BountyAccount::try_deserialize(&mut data_slice).expect("BountyAccount must be deserialized")
}

/// LiteSVM removes accounts that hold no lamports from its database,
/// consequently, a vault with a final balance of zero is reported as `None`.
pub fn lamports(svm: &LiteSVM, address: &Pubkey) -> u64 {
    svm.get_balance(address).unwrap_or(0)
}

pub fn set_workspace_paused(svm: &mut LiteSVM, address: &Pubkey, paused: bool) {
    let mut account = svm.get_account(address).expect("the workspace must exist");
    let mut data_slice: &[u8] = &account.data;
    let mut workspace = WorkspaceConfig::try_deserialize(&mut data_slice)
        .expect("WorkspaceConfig must be deserialized");
    workspace.is_paused = paused;
    let mut out: Vec<u8> = Vec::with_capacity(account.data.len());
    workspace
        .try_serialize(&mut out)
        .expect("the workspace must be serialized");
    account.data = out;
    svm.set_account(*address, account)
        .expect("the paused workspace must be persisted");
}
