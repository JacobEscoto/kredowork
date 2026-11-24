#[path = "common/mod.rs"]
mod common;

use anchor_lang::prelude::Pubkey;
use common::*;
use kredowork::constants::MAX_REVIEWERS;
use kredowork::instructions::update_workspace::UpdateWorkspaceParams;
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_signer::Signer;

fn setup_workspace(svm: &mut LiteSVM, authority: &Keypair, workspace_id: u64) -> Pubkey {
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let params = valid_params(workspace_id);
    send_initialize_workspace_tx(svm, authority, workspace_pda, params)
        .expect("workspace should be initialized");
    workspace_pda
}

#[test]
fn update_workspace_happy_path() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 901_u64;
    let workspace_pda = setup_workspace(&mut svm, &authority, workspace_id);

    let new_reviewer_1 = Pubkey::new_unique();
    let new_reviewer_2 = Pubkey::new_unique();
    let new_reviewer_3 = Pubkey::new_unique();

    let params = UpdateWorkspaceParams {
        challenge_window_secs: Some(1800),
        review_timeout_secs: Some(3600),
        reviewers: Some(vec![new_reviewer_1, new_reviewer_2, new_reviewer_3]),
    };

    let ix = build_update_workspace_ix(authority.pubkey(), workspace_pda, params);
    send_update_workspace_tx(&mut svm, &authority, ix).expect("update workspace should succeed");

    let ws = fetch_workspace(&svm, &workspace_pda);
    assert_eq!(ws.challenge_window_secs, 1800);
    assert_eq!(ws.review_timeout_secs, 3600);
    assert_eq!(ws.reviewers, vec![new_reviewer_1, new_reviewer_2, new_reviewer_3]);
}

#[test]
fn update_workspace_fails_for_non_authority() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 902_u64;
    let workspace_pda = setup_workspace(&mut svm, &authority, workspace_id);

    let impostor = Keypair::new();
    svm.airdrop(&impostor.pubkey(), 10_000_000_000).expect("should fund impostor");

    let params = UpdateWorkspaceParams {
        challenge_window_secs: Some(500),
        review_timeout_secs: None,
        reviewers: None,
    };

    let ix = build_update_workspace_ix(impostor.pubkey(), workspace_pda, params);
    let err = send_update_workspace_tx(&mut svm, &impostor, ix)
        .expect_err("non-authority should fail to update workspace");

    assert!(!err.is_empty());
}

#[test]
fn update_workspace_fails_when_workspace_paused() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 903_u64;
    let workspace_pda = setup_workspace(&mut svm, &authority, workspace_id);

    // Pause the workspace first.
    let ix_pause = build_set_paused_ix(authority.pubkey(), workspace_pda, true);
    send_set_paused_tx(&mut svm, &authority, ix_pause).expect("pause instruction should succeed");

    let params = UpdateWorkspaceParams {
        challenge_window_secs: Some(500),
        review_timeout_secs: None,
        reviewers: None,
    };

    let ix = build_update_workspace_ix(authority.pubkey(), workspace_pda, params);
    let err = send_update_workspace_tx(&mut svm, &authority, ix)
        .expect_err("update should fail when workspace is paused");

    assert!(err.contains("WorkspacePaused"));
}

#[test]
fn update_workspace_fails_when_challenge_window_non_positive() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 904_u64;
    let workspace_pda = setup_workspace(&mut svm, &authority, workspace_id);

    let params = UpdateWorkspaceParams {
        challenge_window_secs: Some(0),
        review_timeout_secs: None,
        reviewers: None,
    };

    let ix = build_update_workspace_ix(authority.pubkey(), workspace_pda, params);
    let err = send_update_workspace_tx(&mut svm, &authority, ix)
        .expect_err("challenge_window <= 0 should fail");

    assert!(err.contains("InvalidWindowDuration"));
}

#[test]
fn update_workspace_fails_when_review_timeout_non_positive() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 905_u64;
    let workspace_pda = setup_workspace(&mut svm, &authority, workspace_id);

    let params = UpdateWorkspaceParams {
        challenge_window_secs: None,
        review_timeout_secs: Some(-1),
        reviewers: None,
    };

    let ix = build_update_workspace_ix(authority.pubkey(), workspace_pda, params);
    let err = send_update_workspace_tx(&mut svm, &authority, ix)
        .expect_err("review_timeout <= 0 should fail");

    assert!(err.contains("InvalidWindowDuration"));
}

#[test]
fn update_workspace_fails_when_too_many_reviewers() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 906_u64;
    let workspace_pda = setup_workspace(&mut svm, &authority, workspace_id);

    let reviewers: Vec<Pubkey> = (0..=MAX_REVIEWERS).map(|_| Pubkey::new_unique()).collect();
    let params = UpdateWorkspaceParams {
        challenge_window_secs: None,
        review_timeout_secs: None,
        reviewers: Some(reviewers),
    };

    let ix = build_update_workspace_ix(authority.pubkey(), workspace_pda, params);
    let err = send_update_workspace_tx(&mut svm, &authority, ix)
        .expect_err("reviewers > MAX_REVIEWERS should fail");

    assert!(err.contains("TooManyReviewers"));
}

#[test]
fn update_workspace_fails_when_quorum_exceeds_reviewers() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 907_u64;
    let workspace_pda = setup_workspace(&mut svm, &authority, workspace_id);
    // Quorum threshold is 2 from valid_params. Providing 1 reviewer must fail.

    let params = UpdateWorkspaceParams {
        challenge_window_secs: None,
        review_timeout_secs: None,
        reviewers: Some(vec![Pubkey::new_unique()]),
    };

    let ix = build_update_workspace_ix(authority.pubkey(), workspace_pda, params);
    let err = send_update_workspace_tx(&mut svm, &authority, ix)
        .expect_err("quorum > reviewers.len() should fail");

    assert!(err.contains("QuorumExceedsReviewers"));
}

#[test]
fn update_workspace_fails_when_duplicate_reviewers() {
    let (mut svm, authority) = setup_svm_with_program();
    let workspace_id = 908_u64;
    let workspace_pda = setup_workspace(&mut svm, &authority, workspace_id);

    let duplicate = Pubkey::new_unique();
    let params = UpdateWorkspaceParams {
        challenge_window_secs: None,
        review_timeout_secs: None,
        reviewers: Some(vec![duplicate, duplicate]),
    };

    let ix = build_update_workspace_ix(authority.pubkey(), workspace_pda, params);
    let err = send_update_workspace_tx(&mut svm, &authority, ix)
        .expect_err("duplicate reviewer should fail");

    assert!(err.contains("DuplicateReviewer"));
}
