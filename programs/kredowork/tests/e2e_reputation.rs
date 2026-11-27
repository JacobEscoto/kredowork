#[path = "common/mod.rs"]
mod common;

use anchor_lang::prelude::{AccountMeta, Pubkey};
use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
use common::*;
use kredowork::constants::{MIN_ARBITER_POOL, REPUTATION_SEED};
use kredowork::instructions::dispute::split_dispute_bond;
use kredowork::instructions::DisputeVoteSide;
use kredowork::state::{BountyStatus, DisputeStatus, ReputationProfile};
use kredowork::ID as PROGRAM_ID;
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_signer::Signer;
use solana_transaction::Instruction;

const CLOCK_UNIX_TIMESTAMP: i64 = 1_700_000_000;
const DEADLINE_UNIX_TIMESTAMP: i64 = 1_700_086_400;
const REWARD_AMOUNT: u64 = 1_000_000_000;
const FEE_BPS: u16 = 250;
const BOND_BPS: u16 = 1000;
const SPEC_HASH: [u8; 32] = [9u8; 32];
const DELIVERY_HASH: [u8; 32] = [7u8; 32];
const CHALLENGE_EVIDENCE_HASH: [u8; 32] = [3u8; 32];
const DEFENSE_EVIDENCE_HASH: [u8; 32] = [4u8; 32];

fn derive_reputation_pda(owner: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[REPUTATION_SEED, owner.as_ref()], &PROGRAM_ID)
}

fn fetch_reputation(svm: &LiteSVM, address: &Pubkey) -> ReputationProfile {
    let account = svm
        .get_account(address)
        .expect("reputation profile must exist");
    let mut data_slice: &[u8] = &account.data;
    ReputationProfile::try_deserialize(&mut data_slice)
        .expect("ReputationProfile must be deserialized")
}

fn fund_keypair(svm: &mut LiteSVM) -> Keypair {
    let kp = Keypair::new();
    svm.airdrop(&kp.pubkey(), 10_000_000_000)
        .expect("should fund keypair");
    kp
}

fn init_reputation(svm: &mut LiteSVM, owner: &Keypair) -> Pubkey {
    let (profile_pda, _) = derive_reputation_pda(&owner.pubkey());
    let accounts = kredowork::accounts::InitializeReputation {
        profile: profile_pda,
        owner: owner.pubkey(),
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);
    let data = kredowork::instruction::InitializeReputation {}.data();
    let ix = Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    };
    send_instruction(svm, ix, owner, &owner.pubkey()).expect("initialize_reputation should succeed");
    profile_pda
}

fn build_finalize_payout_with_rep_ix(
    caller: Pubkey,
    workspace_pda: Pubkey,
    bounty_pda: Pubkey,
    vault_pda: Pubkey,
    contributor: Pubkey,
    contributor_reputation: Pubkey,
    fee_recipient: Pubkey,
    bounty_id: u64,
) -> Instruction {
    let accounts = kredowork::accounts::FinalizePayout {
        workspace: workspace_pda,
        bounty: bounty_pda,
        vault: vault_pda,
        contributor,
        contributor_reputation: Some(contributor_reputation),
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

fn build_reject_work_with_rep_ix(
    reviewer: Pubkey,
    workspace_pda: Pubkey,
    bounty_pda: Pubkey,
    contributor_reputation: Pubkey,
    bounty_id: u64,
) -> Instruction {
    let accounts = kredowork::accounts::RejectWork {
        workspace: workspace_pda,
        bounty: bounty_pda,
        reviewer,
        contributor_reputation: Some(contributor_reputation),
    }
    .to_account_metas(None);

    let data = kredowork::instruction::RejectWork { bounty_id }.data();
    Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    }
}

fn build_submit_defense_ix(
    respondent: Pubkey,
    workspace_pda: Pubkey,
    bounty_pda: Pubkey,
    dispute_pda: Pubkey,
    dispute_vault_pda: Pubkey,
    bounty_id: u64,
    defense_evidence_hash: [u8; 32],
) -> Instruction {
    let accounts = kredowork::accounts::SubmitDefense {
        workspace: workspace_pda,
        bounty: bounty_pda,
        dispute: dispute_pda,
        dispute_vault: dispute_vault_pda,
        respondent,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    let data = kredowork::instruction::SubmitDefense {
        bounty_id,
        defense_evidence_hash,
    }
    .data();
    Instruction {
        program_id: PROGRAM_ID,
        accounts,
        data,
    }
}

#[allow(clippy::too_many_arguments)]
fn build_resolve_dispute_with_rep_ix(
    caller: Pubkey,
    workspace_pda: Pubkey,
    bounty_pda: Pubkey,
    vault_pda: Pubkey,
    dispute_pda: Pubkey,
    dispute_vault_pda: Pubkey,
    sponsor: Pubkey,
    winner: Pubkey,
    loser: Pubkey,
    fee_recipient: Pubkey,
    winner_reputation: Option<Pubkey>,
    loser_reputation: Option<Pubkey>,
    reviewer_reputation: Option<Pubkey>,
    bounty_id: u64,
    arbitrators: Vec<Pubkey>,
) -> Instruction {
    let accounts = kredowork::accounts::ResolveDispute {
        workspace: workspace_pda,
        bounty: bounty_pda,
        dispute: dispute_pda,
        bounty_vault: vault_pda,
        dispute_vault: dispute_vault_pda,
        sponsor,
        winner,
        loser,
        fee_recipient,
        caller,
        system_program: anchor_lang::system_program::ID,
        winner_reputation,
        loser_reputation,
        reviewer_reputation,
    }
    .to_account_metas(None);

    let mut all_accounts = accounts;
    for arbiter in arbitrators {
        all_accounts.push(AccountMeta::new(arbiter, false));
    }

    let data = kredowork::instruction::ResolveDispute { bounty_id }.data();
    Instruction {
        program_id: PROGRAM_ID,
        accounts: all_accounts,
        data,
    }
}

// ── 1) Happy path: workspace -> bounty -> submit -> quorum approve -> finalize_payout + ReputationProfile

#[test]
fn e2e_happy_path_finalize_payout_updates_reputation() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let sponsor = fund_keypair(&mut svm);
    let contributor = fund_keypair(&mut svm);
    let reviewer1 = fund_keypair(&mut svm);
    let reviewer2 = fund_keypair(&mut svm);

    let workspace_id = 901u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.quorum_threshold = 2;
    params.fee_bps = FEE_BPS;
    params.reviewers = vec![reviewer1.pubkey(), reviewer2.pubkey()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params)
        .expect("workspace should be initialized");

    // Initialize contributor's ReputationProfile.
    let contributor_rep_pda = init_reputation(&mut svm, &contributor);

    // Create bounty #0.
    let bounty_id = 0u64;
    let (bounty_pda, _) = derive_bounty_pda(&workspace_pda, bounty_id);
    let (vault_pda, _) = derive_vault_pda(&bounty_pda);
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

    // Submit work.
    let ix = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        bounty_id,
        DELIVERY_HASH,
    );
    send_submit_work_tx(&mut svm, &contributor, ix).expect("work should be submitted");

    // Approve with quorum (2/2).
    let ix = build_approve_work_ix(reviewer1.pubkey(), workspace_pda, bounty_pda, bounty_id);
    send_approve_work_tx(&mut svm, &reviewer1, ix).expect("reviewer1 should approve");
    let ix = build_approve_work_ix(reviewer2.pubkey(), workspace_pda, bounty_pda, bounty_id);
    send_approve_work_tx(&mut svm, &reviewer2, ix).expect("reviewer2 should approve");

    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty.status, BountyStatus::PreApproved);
    let window_ends = bounty.window_ends_at_ts.expect("challenge window must exist");

    // Advance clock past challenge window and finalize payout.
    set_sysvar_clock(&mut svm, window_ends);

    let contributor_before = lamports(&svm, &contributor.pubkey());
    let authority_before = lamports(&svm, &authority.pubkey());

    let ix = build_finalize_payout_with_rep_ix(
        authority.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        contributor.pubkey(),
        contributor_rep_pda,
        authority.pubkey(),
        bounty_id,
    );
    send_instruction(&mut svm, ix, &authority, &authority.pubkey())
        .expect("finalize_payout should succeed");

    // Verify bounty state.
    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty.status, BountyStatus::Completed);
    assert_eq!(bounty.reward_amount, 0);
    assert_eq!(bounty.window_ends_at_ts, None);

    // Verify balances.
    let fee_amount = REWARD_AMOUNT * u64::from(FEE_BPS) / 10_000;
    let payout_amount = REWARD_AMOUNT - fee_amount;
    assert_eq!(lamports(&svm, &vault_pda), 0);
    assert_eq!(
        lamports(&svm, &contributor.pubkey()),
        contributor_before + payout_amount
    );
    assert_eq!(
        lamports(&svm, &authority.pubkey()),
        authority_before + fee_amount - LITESVM_TX_FEE
    );

    // Verify ReputationProfile counters.
    let rep = fetch_reputation(&svm, &contributor_rep_pda);
    assert_eq!(rep.owner, contributor.pubkey());
    assert_eq!(rep.bounties_completed, 1);
    assert_eq!(rep.bounties_rejected, 0);
    assert_eq!(rep.total_earned, payout_amount);
    assert_eq!(rep.disputes_won, 0);
    assert_eq!(rep.disputes_lost, 0);
    assert_eq!(rep.overturned_reviews, 0);
    assert_eq!(rep.reputation_score, 10);
}

// ── 2a) Dispute flow: reject -> challenge -> defense -> vote -> resolve (challenger wins)

#[test]
fn e2e_dispute_challenger_wins_updates_reputation_and_splits_bond() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let sponsor = fund_keypair(&mut svm);
    let contributor = fund_keypair(&mut svm);
    let reviewer = fund_keypair(&mut svm);

    let workspace_id = 902u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.fee_bps = FEE_BPS;
    params.bond_bps = BOND_BPS;
    params.reviewers = vec![reviewer.pubkey(), Pubkey::new_unique()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params)
        .expect("workspace should be initialized");

    let contributor_rep_pda = init_reputation(&mut svm, &contributor);
    let sponsor_rep_pda = init_reputation(&mut svm, &sponsor);
    let reviewer_rep_pda = init_reputation(&mut svm, &reviewer);

    let bounty_id = 0u64;
    let (bounty_pda, _) = derive_bounty_pda(&workspace_pda, bounty_id);
    let (vault_pda, _) = derive_vault_pda(&bounty_pda);
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

    let ix = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        bounty_id,
        DELIVERY_HASH,
    );
    send_submit_work_tx(&mut svm, &contributor, ix).expect("work should be submitted");

    let ix = build_reject_work_with_rep_ix(
        reviewer.pubkey(),
        workspace_pda,
        bounty_pda,
        contributor_rep_pda,
        bounty_id,
    );
    send_reject_work_tx(&mut svm, &reviewer, ix).expect("reject_work should succeed");
    assert_eq!(fetch_bounty(&svm, &bounty_pda).status, BountyStatus::Rejected);

    // Challenge bounty with 9-arbiter pool.
    let (dispute_pda, _) = derive_dispute_pda(&bounty_pda);
    let (dispute_vault_pda, _) = derive_dispute_vault_pda(&dispute_pda);
    let arbiter_kps: Vec<Keypair> = (0..MIN_ARBITER_POOL).map(|_| Keypair::new()).collect();
    let arbitrators: Vec<Pubkey> = arbiter_kps.iter().map(|k| k.pubkey()).collect();

    let ix = build_challenge_bounty_ix(
        contributor.pubkey(),
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        dispute_pda,
        dispute_vault_pda,
        arbitrators,
        bounty_id,
        CHALLENGE_EVIDENCE_HASH,
    );
    send_challenge_bounty_tx(&mut svm, &contributor, ix).expect("challenge_bounty should succeed");
    assert_eq!(fetch_bounty(&svm, &bounty_pda).status, BountyStatus::Disputed);

    // Respondent submits defense bond.
    let ix = build_submit_defense_ix(
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        dispute_pda,
        dispute_vault_pda,
        bounty_id,
        DEFENSE_EVIDENCE_HASH,
    );
    send_instruction(&mut svm, ix, &sponsor, &sponsor.pubkey())
        .expect("submit_defense should succeed");

    // Fund and vote with 2/3 arbiters for Challenger.
    let dispute = fetch_dispute(&svm, &dispute_pda);
    let arbiter0 = arbiter_kps
        .iter()
        .find(|k| k.pubkey() == dispute.arbiters[0])
        .expect("arbiter0 must be in pool");
    let arbiter1 = arbiter_kps
        .iter()
        .find(|k| k.pubkey() == dispute.arbiters[1])
        .expect("arbiter1 must be in pool");
    let arbiter2 = arbiter_kps
        .iter()
        .find(|k| k.pubkey() == dispute.arbiters[2])
        .expect("arbiter2 must be in pool");
    svm.airdrop(&arbiter0.pubkey(), 1_000_000_000)
        .expect("fund arbiter0");
    svm.airdrop(&arbiter1.pubkey(), 1_000_000_000)
        .expect("fund arbiter1");
    svm.airdrop(&arbiter2.pubkey(), 1_000_000_000)
        .expect("fund arbiter2");

    let ix = build_vote_dispute_ix(
        arbiter0.pubkey(),
        workspace_pda,
        bounty_pda,
        dispute_pda,
        bounty_id,
        DisputeVoteSide::Challenger,
    );
    send_vote_dispute_tx(&mut svm, arbiter0, ix).expect("arbiter0 vote should succeed");

    let ix = build_vote_dispute_ix(
        arbiter1.pubkey(),
        workspace_pda,
        bounty_pda,
        dispute_pda,
        bounty_id,
        DisputeVoteSide::Challenger,
    );
    send_vote_dispute_tx(&mut svm, arbiter1, ix).expect("arbiter1 vote should succeed");

    let contributor_before = lamports(&svm, &contributor.pubkey());
    let authority_before = lamports(&svm, &authority.pubkey());
    let arbiter0_before = lamports(&svm, &arbiter0.pubkey());
    let arbiter1_before = lamports(&svm, &arbiter1.pubkey());
    let arbiter2_before = lamports(&svm, &arbiter2.pubkey());

    let ix = build_resolve_dispute_with_rep_ix(
        authority.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        dispute_pda,
        dispute_vault_pda,
        sponsor.pubkey(),
        contributor.pubkey(),
        sponsor.pubkey(),
        authority.pubkey(),
        Some(contributor_rep_pda),
        Some(sponsor_rep_pda),
        Some(reviewer_rep_pda),
        bounty_id,
        dispute.arbiters.to_vec(),
    );
    send_resolve_dispute_tx(&mut svm, &authority, ix).expect("resolve_dispute should succeed");

    // Verify final states.
    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty.status, BountyStatus::Completed);
    assert_eq!(bounty.reward_amount, 0);
    assert_eq!(bounty.locked_bond, 0);

    let dispute = fetch_dispute(&svm, &dispute_pda);
    assert_eq!(dispute.status, DisputeStatus::ResolvedForChallenger);

    // Verify bond split & payout balances.
    let single_bond = REWARD_AMOUNT * u64::from(BOND_BPS) / 10_000;
    let total_bond = single_bond * 2;
    let (winner_bond_share, per_arbiter) =
        split_dispute_bond(total_bond).expect("bond split should succeed");
    let fee_amount = REWARD_AMOUNT * u64::from(FEE_BPS) / 10_000;
    let payout_amount = REWARD_AMOUNT - fee_amount;

    assert_eq!(lamports(&svm, &vault_pda), 0);
    assert_eq!(lamports(&svm, &dispute_vault_pda), 0);
    assert_eq!(
        lamports(&svm, &contributor.pubkey()),
        contributor_before + payout_amount + winner_bond_share
    );
    assert_eq!(
        lamports(&svm, &authority.pubkey()),
        authority_before + fee_amount - LITESVM_TX_FEE
    );
    assert_eq!(lamports(&svm, &arbiter0.pubkey()), arbiter0_before + per_arbiter);
    assert_eq!(lamports(&svm, &arbiter1.pubkey()), arbiter1_before + per_arbiter);
    assert_eq!(lamports(&svm, &arbiter2.pubkey()), arbiter2_before + per_arbiter);

    // Verify ReputationProfiles.
    let contributor_rep = fetch_reputation(&svm, &contributor_rep_pda);
    assert_eq!(contributor_rep.disputes_won, 1);
    assert_eq!(contributor_rep.disputes_lost, 0);
    assert_eq!(contributor_rep.bounties_completed, 1);
    assert_eq!(contributor_rep.total_earned, payout_amount);
    assert_eq!(contributor_rep.reputation_score, 15);

    let sponsor_rep = fetch_reputation(&svm, &sponsor_rep_pda);
    assert_eq!(sponsor_rep.disputes_won, 0);
    assert_eq!(sponsor_rep.disputes_lost, 1);
    assert_eq!(sponsor_rep.reputation_score, -10);
}

// ── 2b) Dispute flow: reject -> challenge -> defense -> vote -> resolve (respondent wins)

#[test]
fn e2e_dispute_respondent_wins_updates_states_and_splits_bond() {
    let (mut svm, authority) = setup_svm_with_program();
    set_sysvar_clock(&mut svm, CLOCK_UNIX_TIMESTAMP);

    let sponsor = fund_keypair(&mut svm);
    let contributor = fund_keypair(&mut svm);
    let reviewer = fund_keypair(&mut svm);

    let workspace_id = 903u64;
    let (workspace_pda, _) = derive_workspace_pda(&authority.pubkey(), workspace_id);
    let mut params = valid_params(workspace_id);
    params.fee_bps = FEE_BPS;
    params.bond_bps = BOND_BPS;
    params.reviewers = vec![reviewer.pubkey(), Pubkey::new_unique()];
    send_initialize_workspace_tx(&mut svm, &authority, workspace_pda, params)
        .expect("workspace should be initialized");

    let contributor_rep_pda = init_reputation(&mut svm, &contributor);
    let sponsor_rep_pda = init_reputation(&mut svm, &sponsor);

    let bounty_id = 0u64;
    let (bounty_pda, _) = derive_bounty_pda(&workspace_pda, bounty_id);
    let (vault_pda, _) = derive_vault_pda(&bounty_pda);
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

    let ix = build_submit_work_ix(
        contributor.pubkey(),
        workspace_pda,
        bounty_pda,
        bounty_id,
        DELIVERY_HASH,
    );
    send_submit_work_tx(&mut svm, &contributor, ix).expect("work should be submitted");

    let ix = build_reject_work_with_rep_ix(
        reviewer.pubkey(),
        workspace_pda,
        bounty_pda,
        contributor_rep_pda,
        bounty_id,
    );
    send_reject_work_tx(&mut svm, &reviewer, ix).expect("reject_work should succeed");

    let (dispute_pda, _) = derive_dispute_pda(&bounty_pda);
    let (dispute_vault_pda, _) = derive_dispute_vault_pda(&dispute_pda);
    let arbiter_kps: Vec<Keypair> = (0..MIN_ARBITER_POOL).map(|_| Keypair::new()).collect();
    let arbitrators: Vec<Pubkey> = arbiter_kps.iter().map(|k| k.pubkey()).collect();

    let ix = build_challenge_bounty_ix(
        contributor.pubkey(),
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        dispute_pda,
        dispute_vault_pda,
        arbitrators,
        bounty_id,
        CHALLENGE_EVIDENCE_HASH,
    );
    send_challenge_bounty_tx(&mut svm, &contributor, ix).expect("challenge_bounty should succeed");

    let ix = build_submit_defense_ix(
        sponsor.pubkey(),
        workspace_pda,
        bounty_pda,
        dispute_pda,
        dispute_vault_pda,
        bounty_id,
        DEFENSE_EVIDENCE_HASH,
    );
    send_instruction(&mut svm, ix, &sponsor, &sponsor.pubkey())
        .expect("submit_defense should succeed");

    // Fund and vote with 2/3 arbiters for Respondent.
    let dispute = fetch_dispute(&svm, &dispute_pda);
    let arbiter0 = arbiter_kps
        .iter()
        .find(|k| k.pubkey() == dispute.arbiters[0])
        .expect("arbiter0 must be in pool");
    let arbiter1 = arbiter_kps
        .iter()
        .find(|k| k.pubkey() == dispute.arbiters[1])
        .expect("arbiter1 must be in pool");
    let arbiter2 = arbiter_kps
        .iter()
        .find(|k| k.pubkey() == dispute.arbiters[2])
        .expect("arbiter2 must be in pool");
    svm.airdrop(&arbiter0.pubkey(), 1_000_000_000)
        .expect("fund arbiter0");
    svm.airdrop(&arbiter1.pubkey(), 1_000_000_000)
        .expect("fund arbiter1");
    svm.airdrop(&arbiter2.pubkey(), 1_000_000_000)
        .expect("fund arbiter2");

    let ix = build_vote_dispute_ix(
        arbiter0.pubkey(),
        workspace_pda,
        bounty_pda,
        dispute_pda,
        bounty_id,
        DisputeVoteSide::Respondent,
    );
    send_vote_dispute_tx(&mut svm, arbiter0, ix).expect("arbiter0 vote should succeed");

    let ix = build_vote_dispute_ix(
        arbiter1.pubkey(),
        workspace_pda,
        bounty_pda,
        dispute_pda,
        bounty_id,
        DisputeVoteSide::Respondent,
    );
    send_vote_dispute_tx(&mut svm, arbiter1, ix).expect("arbiter1 vote should succeed");

    let sponsor_before = lamports(&svm, &sponsor.pubkey());
    let arbiter0_before = lamports(&svm, &arbiter0.pubkey());
    let arbiter1_before = lamports(&svm, &arbiter1.pubkey());
    let arbiter2_before = lamports(&svm, &arbiter2.pubkey());

    let ix = build_resolve_dispute_with_rep_ix(
        authority.pubkey(),
        workspace_pda,
        bounty_pda,
        vault_pda,
        dispute_pda,
        dispute_vault_pda,
        sponsor.pubkey(),
        sponsor.pubkey(),
        contributor.pubkey(),
        authority.pubkey(),
        Some(sponsor_rep_pda),
        Some(contributor_rep_pda),
        None,
        bounty_id,
        dispute.arbiters.to_vec(),
    );
    send_resolve_dispute_tx(&mut svm, &authority, ix).expect("resolve_dispute should succeed");

    // Verify final states.
    let bounty = fetch_bounty(&svm, &bounty_pda);
    assert_eq!(bounty.status, BountyStatus::Cancelled);
    assert_eq!(bounty.reward_amount, 0);
    assert_eq!(bounty.locked_bond, 0);

    let dispute = fetch_dispute(&svm, &dispute_pda);
    assert_eq!(dispute.status, DisputeStatus::ResolvedForRespondent);

    // Verify bond split & full reward refund to sponsor.
    let single_bond = REWARD_AMOUNT * u64::from(BOND_BPS) / 10_000;
    let total_bond = single_bond * 2;
    let (winner_bond_share, per_arbiter) =
        split_dispute_bond(total_bond).expect("bond split should succeed");

    assert_eq!(lamports(&svm, &vault_pda), 0);
    assert_eq!(lamports(&svm, &dispute_vault_pda), 0);
    assert_eq!(
        lamports(&svm, &sponsor.pubkey()),
        sponsor_before + REWARD_AMOUNT + winner_bond_share
    );
    assert_eq!(lamports(&svm, &arbiter0.pubkey()), arbiter0_before + per_arbiter);
    assert_eq!(lamports(&svm, &arbiter1.pubkey()), arbiter1_before + per_arbiter);
    assert_eq!(lamports(&svm, &arbiter2.pubkey()), arbiter2_before + per_arbiter);

    // Verify ReputationProfiles (currently unchanged in respondent-win refund branch).
    let sponsor_rep = fetch_reputation(&svm, &sponsor_rep_pda);
    assert_eq!(sponsor_rep.disputes_won, 0);
    assert_eq!(sponsor_rep.disputes_lost, 0);
    assert_eq!(sponsor_rep.reputation_score, 0);

    let contributor_rep = fetch_reputation(&svm, &contributor_rep_pda);
    assert_eq!(contributor_rep.bounties_completed, 0);
    assert_eq!(contributor_rep.disputes_lost, 0);
    assert_eq!(contributor_rep.reputation_score, 0);
}
