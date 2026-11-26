#[path = "common/mod.rs"]
mod common;

use anchor_lang::prelude::{AccountMeta, Pubkey};
use anchor_lang::{InstructionData, ToAccountMetas};
use common::*;
use kredowork::constants::{ARBITERS_COUNT, MIN_ARBITER_POOL};
use kredowork::instructions::dispute::split_dispute_bond;
use kredowork::instructions::DisputeVoteSide;
use kredowork::state::BountyStatus;
use kredowork::ID as PROGRAM_ID;
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::Instruction;

const CLOCK_UNIX_TIMESTAMP: i64 = 1_700_000_000;
const DEADLINE_UNIX_TIMESTAMP: i64 = 1_700_086_400;
const REWARD_AMOUNT: u64 = 1_000_000_000;
const CHALLENGE_EVIDENCE_HASH: [u8; 32] = [7u8; 32];
const DELIVERY_HASH: [u8; 32] = [7u8; 32];

// ── Setup helper: creates a rejected bounty ───────────────────────────────────

fn setup_rejected_bounty(
    svm: &mut LiteSVM,
    authority: &Keypair,
    sponsor: &Keypair,
    contributor: &Keypair,
    reviewer: &Keypair,
    workspace_id: u64,
) -> (Pubkey, Pubkey, Pubkey, Pubkey, Pubkey, Pubkey, u64) {
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.reviewers = vec![reviewer.pubkey(), Pubkey::new_unique()];
    send_initialize_workspace_tx(svm, authority, workspace_pda, params)
        .expect("workspace should be initialized");

    let sponsor_key = sponsor.pubkey();
    let (bounty_pda, _) = derive_bounty_pda(&workspace_pda, 0);
    let (vault_pda, _) = derive_vault_pda(&bounty_pda);
    let ix = build_create_bounty_ix(
        sponsor_key,
        workspace_pda,
        bounty_pda,
        vault_pda,
        REWARD_AMOUNT,
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

    (
        workspace_pda,
        bounty_pda,
        vault_pda,
        contributor.pubkey(),
        sponsor_key,
        reviewer.pubkey(),
        0,
    )
}

fn build_challenge(
    challenger: Pubkey,
    respondent: Pubkey,
    workspace_pda: Pubkey,
    bounty_pda: Pubkey,
    dispute_pda: Pubkey,
    dispute_vault_pda: Pubkey,
    bounty_id: u64,
    arbitrators: Vec<Pubkey>,
) -> Instruction {
    let accounts = kredowork::accounts::ChallengeBounty {
        workspace: workspace_pda,
        bounty: bounty_pda,
        dispute: dispute_pda,
        dispute_vault: dispute_vault_pda,
        challenger,
        respondent,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    let mut all_accounts = accounts;
    for arbiter in arbitrators {
        all_accounts.push(AccountMeta::new_readonly(arbiter, false));
    }

    let data = kredowork::instruction::ChallengeBounty {
        bounty_id,
        challenge_evidence_hash: CHALLENGE_EVIDENCE_HASH,
    }
    .data();

    Instruction {
        program_id: PROGRAM_ID,
        accounts: all_accounts,
        data,
    }
}

// ── Dispute bond split ───────────────────────────────────────────────────────

#[test]
fn dispute_split_bond_distributes_winner_share_and_arbiter_pool() {
    let (winner_total, per_arbiter) = split_dispute_bond(10_000_000).expect("split should succeed");
    assert_eq!(
        winner_total, 7_000_000,
        "winner should receive 70% of the bond"
    );
    assert_eq!(
        per_arbiter, 1_000_000,
        "each arbiter should receive 30% / 3"
    );

    let (winner_total, per_arbiter) = split_dispute_bond(10_000_001).expect("split should succeed");
    assert_eq!(
        winner_total, 7_000_001,
        "winner should receive 70% plus the remainder"
    );
    assert_eq!(per_arbiter, 1_000_000);
}

// ── Challenge: candidate pool ─────────────────────────────────────────────────

#[test]
fn challenge_bounty_fails_when_candidate_pool_is_small() {
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

    let (workspace_pda, bounty_pda, _vault_pda, _claimant, sponsor_key, _reviewer, bounty_id) =
        setup_rejected_bounty(&mut svm, &authority, &sponsor, &contributor, &reviewer, 502);

    let (dispute_pda, _) = derive_dispute_pda(&bounty_pda);
    let (dispute_vault_pda, _) = derive_dispute_vault_pda(&dispute_pda);

    let mut arbitrators: Vec<Pubkey> = Vec::new();
    for _ in 0..5 {
        arbitrators.push(Pubkey::new_unique());
    }

    let ix = build_challenge(
        contributor.pubkey(),
        sponsor_key,
        workspace_pda,
        bounty_pda,
        dispute_pda,
        dispute_vault_pda,
        bounty_id,
        arbitrators,
    );
    let err = send_challenge_bounty_tx(&mut svm, &contributor, ix)
        .expect_err("candidate pool below MIN_ARBITER_POOL should fail");

    let err_msg = &err;
    assert!(
        err_msg.contains("UnauthorizedArbiter") || err_msg.contains("6004"),
        "unexpected error: {err_msg}"
    );
}

#[test]
fn challenge_bounty_fails_for_invalid_pair() {
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

    let (workspace_pda, bounty_pda, _vault_pda, _claimant, sponsor_key, _reviewer, bounty_id) =
        setup_rejected_bounty(&mut svm, &authority, &sponsor, &contributor, &reviewer, 503);

    let (dispute_pda, _) = derive_dispute_pda(&bounty_pda);
    let (dispute_vault_pda, _) = derive_dispute_vault_pda(&dispute_pda);

    let mut arbitrators: Vec<Pubkey> = Vec::new();
    for _ in 0..MIN_ARBITER_POOL {
        arbitrators.push(Pubkey::new_unique());
    }

    let impostor = Keypair::new();
    svm.airdrop(&impostor.pubkey(), 10_000_000_000)
        .expect("should fund impostor");

    let ix = build_challenge(
        impostor.pubkey(),
        sponsor_key,
        workspace_pda,
        bounty_pda,
        dispute_pda,
        dispute_vault_pda,
        bounty_id,
        arbitrators,
    );
    let err = send_challenge_bounty_tx(&mut svm, &impostor, ix)
        .expect_err("challenger must be the rejected claimant");

    let err_msg = &err;
    assert!(
        err_msg.contains("InvalidChallenger") || err_msg.contains("6022"),
        "unexpected error: {err_msg}"
    );
}

#[test]
fn challenge_bounty_selects_arbiters_from_filtered_pool() {
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

    let (workspace_pda, bounty_pda, _vault_pda, _claimant, sponsor_key, reviewer_key, bounty_id) =
        setup_rejected_bounty(&mut svm, &authority, &sponsor, &contributor, &reviewer, 504);

    let (dispute_pda, _) = derive_dispute_pda(&bounty_pda);
    let (dispute_vault_pda, _) = derive_dispute_vault_pda(&dispute_pda);

    // Nine clean candidates plus one workspace reviewer (excluded) => 9 eligible.
    let mut arbitrators: Vec<Pubkey> = Vec::new();
    for _ in 0..9 {
        arbitrators.push(Pubkey::new_unique());
    }
    arbitrators.push(reviewer_key);

    let ix = build_challenge(
        contributor.pubkey(),
        sponsor_key,
        workspace_pda,
        bounty_pda,
        dispute_pda,
        dispute_vault_pda,
        bounty_id,
        arbitrators,
    );
    send_challenge_bounty_tx(&mut svm, &contributor, ix).expect("challenge should succeed");

    let dispute = fetch_dispute(&svm, &dispute_pda);
    assert_eq!(dispute.arbiters.len(), ARBITERS_COUNT);
    assert!(!dispute.arbiters.contains(&reviewer_key));
}

// ── Vote dispute ─────────────────────────────────────────────────────────────

#[test]
fn vote_dispute_fails_on_duplicate_action() {
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

    let (workspace_pda, bounty_pda, _vault_pda, _claimant, sponsor_key, _reviewer, bounty_id) =
        setup_rejected_bounty(&mut svm, &authority, &sponsor, &contributor, &reviewer, 505);

    let (dispute_pda, _) = derive_dispute_pda(&bounty_pda);
    let (dispute_vault_pda, _) = derive_dispute_vault_pda(&dispute_pda);

    let arbiter_kps: Vec<Keypair> = (0..MIN_ARBITER_POOL).map(|_| Keypair::new()).collect();
    let arbitrators: Vec<Pubkey> = arbiter_kps.iter().map(|k| k.pubkey()).collect();

    let ix = build_challenge(
        contributor.pubkey(),
        sponsor_key,
        workspace_pda,
        bounty_pda,
        dispute_pda,
        dispute_vault_pda,
        bounty_id,
        arbitrators,
    );
    send_challenge_bounty_tx(&mut svm, &contributor, ix).expect("challenge should succeed");

    let dispute = fetch_dispute(&svm, &dispute_pda);
    let arbiter_key = dispute.arbiters[0];
    let arbiter = arbiter_kps
        .iter()
        .find(|k| k.pubkey() == arbiter_key)
        .expect("arbiter keypair should be found in the candidate pool");
    svm.airdrop(&arbiter.pubkey(), 10_000_000_000)
        .expect("should fund arbiter");

    let ix = build_vote_dispute_ix(
        arbiter_key,
        workspace_pda,
        bounty_pda,
        dispute_pda,
        bounty_id,
        DisputeVoteSide::Challenger,
    );
    send_vote_dispute_tx(&mut svm, arbiter, ix).expect("first vote should succeed");

    let ix = build_vote_dispute_ix(
        arbiter_key,
        workspace_pda,
        bounty_pda,
        dispute_pda,
        bounty_id,
        DisputeVoteSide::Challenger,
    );
    let err = send_vote_dispute_tx(&mut svm, arbiter, ix).expect_err("arbiter cannot vote twice");

    let err_msg = &err;
    assert!(
        err_msg.contains("DuplicateAction") || err_msg.contains("6011"),
        "unexpected error: {err_msg}"
    );
}

// ── Resolve dispute ──────────────────────────────────────────────────────────

#[test]
fn resolve_dispute_tie_keeps_sponsor_decision() {
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

    let (workspace_pda, bounty_pda, vault_pda, claimant_key, sponsor_key, _reviewer, bounty_id) =
        setup_rejected_bounty(&mut svm, &authority, &sponsor, &contributor, &reviewer, 506);

    let (dispute_pda, _) = derive_dispute_pda(&bounty_pda);
    let (dispute_vault_pda, _) = derive_dispute_vault_pda(&dispute_pda);

    let arbiter_kps: Vec<Keypair> = (0..MIN_ARBITER_POOL).map(|_| Keypair::new()).collect();
    let arbitrators: Vec<Pubkey> = arbiter_kps.iter().map(|k| k.pubkey()).collect();

    let ix = build_challenge(
        contributor.pubkey(),
        sponsor_key,
        workspace_pda,
        bounty_pda,
        dispute_pda,
        dispute_vault_pda,
        bounty_id,
        arbitrators,
    );
    send_challenge_bounty_tx(&mut svm, &contributor, ix).expect("challenge should succeed");

    // Tie: one vote for challenger, one for respondent.
    let dispute = fetch_dispute(&svm, &dispute_pda);
    let arbiter0 = arbiter_kps
        .iter()
        .find(|k| k.pubkey() == dispute.arbiters[0])
        .expect("arbiter0 keypair should be found in the candidate pool");
    svm.airdrop(&arbiter0.pubkey(), 10_000_000_000)
        .expect("should fund arbiter0");
    let arbiter1 = arbiter_kps
        .iter()
        .find(|k| k.pubkey() == dispute.arbiters[1])
        .expect("arbiter1 keypair should be found in the candidate pool");
    svm.airdrop(&arbiter1.pubkey(), 10_000_000_000)
        .expect("should fund arbiter1");

    let ix = build_vote_dispute_ix(
        dispute.arbiters[0],
        workspace_pda,
        bounty_pda,
        dispute_pda,
        bounty_id,
        DisputeVoteSide::Challenger,
    );
    send_vote_dispute_tx(&mut svm, arbiter0, ix).expect("arbiter0 should vote challenger");
    let ix = build_vote_dispute_ix(
        dispute.arbiters[1],
        workspace_pda,
        bounty_pda,
        dispute_pda,
        bounty_id,
        DisputeVoteSide::Respondent,
    );
    send_vote_dispute_tx(&mut svm, arbiter1, ix).expect("arbiter1 should vote respondent");

    // Deadline expiry decides the dispute.
    set_sysvar_clock(&mut svm, DEADLINE_UNIX_TIMESTAMP + 1);

    let mut resolve_arbiters = Vec::new();
    for arbiter in dispute.arbiters {
        resolve_arbiters.push(arbiter);
    }
    let ix = build_resolve_dispute_ix(
        authority.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        dispute_pda,
        dispute_vault_pda,
        sponsor_key,
        sponsor_key,
        claimant_key,
        authority.pubkey(),
        bounty_id,
        resolve_arbiters,
    );
    send_resolve_dispute_tx(&mut svm, &authority, ix).expect("resolve should succeed");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(
        bounty.status,
        BountyStatus::Cancelled,
        "sponsor win should mark the bounty Cancelled"
    );
}

#[test]
fn resolve_dispute_challenger_majority_wins() {
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

    let (workspace_pda, bounty_pda, vault_pda, claimant_key, sponsor_key, _reviewer, bounty_id) =
        setup_rejected_bounty(&mut svm, &authority, &sponsor, &contributor, &reviewer, 507);

    let (dispute_pda, _) = derive_dispute_pda(&bounty_pda);
    let (dispute_vault_pda, _) = derive_dispute_vault_pda(&dispute_pda);

    let arbiter_kps: Vec<Keypair> = (0..MIN_ARBITER_POOL).map(|_| Keypair::new()).collect();
    let arbitrators: Vec<Pubkey> = arbiter_kps.iter().map(|k| k.pubkey()).collect();

    let ix = build_challenge(
        contributor.pubkey(),
        sponsor_key,
        workspace_pda,
        bounty_pda,
        dispute_pda,
        dispute_vault_pda,
        bounty_id,
        arbitrators,
    );
    send_challenge_bounty_tx(&mut svm, &contributor, ix).expect("challenge should succeed");

    // Two of the three arbitrators side with the challenger → majority.
    let dispute = fetch_dispute(&svm, &dispute_pda);
    let arbiter0 = arbiter_kps
        .iter()
        .find(|k| k.pubkey() == dispute.arbiters[0])
        .expect("arbiter0 keypair should be found in the candidate pool");
    svm.airdrop(&arbiter0.pubkey(), 10_000_000_000)
        .expect("should fund arbiter0");
    let arbiter1 = arbiter_kps
        .iter()
        .find(|k| k.pubkey() == dispute.arbiters[1])
        .expect("arbiter1 keypair should be found in the candidate pool");
    svm.airdrop(&arbiter1.pubkey(), 10_000_000_000)
        .expect("should fund arbiter1");

    let ix = build_vote_dispute_ix(
        dispute.arbiters[0],
        workspace_pda,
        bounty_pda,
        dispute_pda,
        bounty_id,
        DisputeVoteSide::Challenger,
    );
    send_vote_dispute_tx(&mut svm, arbiter0, ix).expect("arbiter0 should vote challenger");
    let ix = build_vote_dispute_ix(
        dispute.arbiters[1],
        workspace_pda,
        bounty_pda,
        dispute_pda,
        bounty_id,
        DisputeVoteSide::Challenger,
    );
    send_vote_dispute_tx(&mut svm, arbiter1, ix).expect("arbiter1 should vote challenger");

    let mut resolve_arbiters = Vec::new();
    for arbiter in dispute.arbiters {
        resolve_arbiters.push(arbiter);
    }
    let ix = build_resolve_dispute_ix(
        authority.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        dispute_pda,
        dispute_vault_pda,
        sponsor_key,
        claimant_key,
        sponsor_key,
        authority.pubkey(),
        bounty_id,
        resolve_arbiters,
    );
    send_resolve_dispute_tx(&mut svm, &authority, ix).expect("resolve should succeed");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty.status, BountyStatus::Completed);
}
