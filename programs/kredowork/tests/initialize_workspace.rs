use std::path::PathBuf;

use anchor_lang::{prelude::*, InstructionData, ToAccountMetas};
use kredowork::{
    constants::{MAX_REVIEWERS, WORKSPACE_SEED},
    instructions::initialize_workspace::WorkspaceParams,
    state::WorkspaceConfig,
    ID as PROGRAM_ID,
};
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::{Instruction, Transaction};

const PROGRAM_SO_ENV: &str = "KREDOWORK_PROGRAM_SO";

fn program_so_path() -> PathBuf {
    std::env::var_os(PROGRAM_SO_ENV)
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../target/deploy/kredowork.so")
        })
}

fn setup_svm_with_program() -> (LiteSVM, Keypair) {
    let mut svm = LiteSVM::new();
    let authority = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000)
        .expect("debería financiar la authority");

    let program_path = program_so_path();
    svm.add_program_from_file(PROGRAM_ID, &program_path)
        .unwrap_or_else(|e| {
            panic!(
                "no se pudo cargar {}: {e}. Ejecuta `anchor build` o define {PROGRAM_SO_ENV} con la ruta al .so",
                program_path.display()
            )
        });

    (svm, authority)
}

fn derive_workspace_pda(authority: &Pubkey, workspace_id: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            WORKSPACE_SEED,
            authority.as_ref(),
            &workspace_id.to_le_bytes(),
        ],
        &PROGRAM_ID,
    )
}

fn build_init_workspace_ix(
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

fn valid_params(workspace_id: u64) -> WorkspaceParams {
    WorkspaceParams {
        workspace_id,
        quorum_threshold: 2,
        max_submission_atempts: 3,
        challenge_window_secs: 3600,
        review_timeout_secs: 7200,
        fee_bps: 250,
        bond_bps: 1000,
        reviewers: vec![Pubkey::new_unique(), Pubkey::new_unique()],
    }
}

fn send_init_tx(
    svm: &mut LiteSVM,
    authority: &Keypair,
    workspace_pda: Pubkey,
    params: WorkspaceParams,
) -> std::result::Result<(), String> {
    let ix = build_init_workspace_ix(authority.pubkey(), workspace_pda, params);
    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&authority.pubkey()),
        &[authority],
        svm.latest_blockhash(),
    );

    svm.send_transaction(tx)
        .map(|_| ())
        .map_err(|e| format!("{e:?}"))
}

#[test]
fn initialize_workspace_happy_path() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 1_u64;
    let (workspace_pda, expected_bump) = derive_workspace_pda(&authority.pubkey(), workspace_id);

    let reviewer_1 = Pubkey::new_unique();
    let reviewer_2 = Pubkey::new_unique();

    let mut params = valid_params(workspace_id);
    params.reviewers = vec![reviewer_1, reviewer_2];

    send_init_tx(&mut svm, &authority, workspace_pda, params)
        .expect("the workspace should be initialized");

    let account = svm.get_account(&workspace_pda).expect("the PDA must exist");
    let mut data_slice: &[u8] = &account.data;
    let state = WorkspaceConfig::try_deserialize(&mut data_slice)
        .expect("WorkspaceConfig must be deserialized");

    assert_eq!(state.authority, authority.pubkey());
    assert_eq!(state.workspace_id, workspace_id);
    assert_eq!(state.bounty_count, 0);
    assert_eq!(state.quorum_threshold, 2);
    assert_eq!(state.challenge_window_secs, 3600);
    assert_eq!(state.review_timeout_secs, 7200);
    assert_eq!(state.fee_bps, 250);
    assert_eq!(state.bond_bps, 1000);
    assert_eq!(state.reviewers, vec![reviewer_1, reviewer_2]);
    assert!(!state.is_paused);
    assert_eq!(state.bump, expected_bump);
}

#[test]
fn initialize_workspace_fails_when_too_many_reviewers() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 2_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);

    let mut params = valid_params(workspace_id);
    params.quorum_threshold = 1;
    params.reviewers = (0..=MAX_REVIEWERS).map(|_| Pubkey::new_unique()).collect();

    let err = send_init_tx(&mut svm, &authority, workspace_pda, params)
        .expect_err("it should fail if reviewers.len() > MAX_REVIEWERS");

    assert!(
        err.contains("TooManyReviewers") || err.contains("6006"),
        "unexpected error: {err}"
    );
}

#[test]
fn initialize_workspace_fails_when_quorum_is_zero() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 3_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);

    let mut params = valid_params(workspace_id);
    params.quorum_threshold = 0;

    let err = send_init_tx(&mut svm, &authority, workspace_pda, params)
        .expect_err("it should fail if quorum_threshold is 0");

    assert!(err.contains("QuorumNotReached"), "unexpected error: {err}");
}

#[test]
fn initialize_workspace_fails_when_quorum_exceeds_reviewers() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 4_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);

    let mut params = valid_params(workspace_id);
    params.reviewers = vec![Pubkey::new_unique()];
    params.quorum_threshold = 2;

    let err = send_init_tx(&mut svm, &authority, workspace_pda, params)
        .expect_err("it should fail if quorum_threshold > reviewers.len()");

    assert!(err.contains("QuorumNotReached"), "unexpected error: {err}");
}

#[test]
fn initialize_workspace_fails_when_windows_not_positive() {
    let (mut svm, authority) = setup_svm_with_program();

    let workspace_id_challenge = 5_u64;
    let (pda_challenge, _) = derive_workspace_pda(&authority.pubkey(), workspace_id_challenge);
    let mut params_challenge = valid_params(workspace_id_challenge);
    params_challenge.challenge_window_secs = 0;

    let err_challenge = send_init_tx(&mut svm, &authority, pda_challenge, params_challenge)
        .expect_err("it should fail with challenge_window_secs <= 0");
    assert!(
        err_challenge.contains("InvalidDeadline"),
        "unexpected error: {err_challenge}"
    );

    let workspace_id_review = 6_u64;
    let (pda_review, _) = derive_workspace_pda(&authority.pubkey(), workspace_id_review);
    let mut params_review = valid_params(workspace_id_review);
    params_review.review_timeout_secs = -10;

    let err_review = send_init_tx(&mut svm, &authority, pda_review, params_review)
        .expect_err("it should fail with review_timeout_secs <= 0");
    assert!(
        err_review.contains("InvalidDeadline"),
        "unexpected error: {err_review}"
    );
}

#[test]
fn initialize_workspace_fails_on_duplicate_pda() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 7_u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let params = valid_params(workspace_id);

    send_init_tx(&mut svm, &authority, workspace_pda, params.clone())
        .expect("the first initialization should succeed");

    let err = send_init_tx(&mut svm, &authority, workspace_pda, params)
        .expect_err("the second initialization on the same PDA should fail");

    assert!(!err.is_empty());
}
