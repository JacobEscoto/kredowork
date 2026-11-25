use crate::constants::*;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum BountyStatus {
    Open,
    Claimed,
    Submitted,
    PreApproved,
    Rejected,
    Disputed,
    Completed,
    Cancelled,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum DisputeStatus {
    Open,
    ResolvedForChallenger,
    ResolvedForRespondent,
}

#[account]
#[derive(InitSpace)]
pub struct WorkspaceConfig {
    pub authority: Pubkey,
    pub workspace_id: u64,
    pub bounty_count: u64,
    pub quorum_threshold: u8,
    pub max_submission_attempts: u8,
    pub challenge_window_secs: i64,
    pub review_timeout_secs: i64,
    pub fee_bps: u16,
    pub bond_bps: u16,
    #[max_len(MAX_REVIEWERS)]
    pub reviewers: Vec<Pubkey>,
    pub is_paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BountyAccount {
    pub workspace: Pubkey,
    pub sponsor: Pubkey,
    pub claimant: Option<Pubkey>,
    pub rejected_claimant: Option<Pubkey>,
    pub rejected_by: Option<Pubkey>,
    pub bounty_id: u64,
    pub reward_amount: u64,
    pub locked_bond: u64,
    pub spec_hash: [u8; 32],
    pub delivery_hash: Option<[u8; 32]>,
    pub status: BountyStatus,
    pub deadline_ts: i64,
    pub submitted_at_ts: Option<i64>,
    pub window_ends_at_ts: Option<i64>,
    pub approvals_count: u8,
    pub approvals_mask: u8,
    pub bump: u8,
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct DisputeAccount {
    pub bounty: Pubkey,
    pub challenger: Pubkey,
    pub respondent: Pubkey,
    pub challenge_bond: u64,
    pub defense_bond: u64,
    pub challenge_evidence_hash: [u8; 32],
    pub defense_evidence_hash: Option<[u8; 32]>,
    pub arbiters: [Pubkey; ARBITERS_COUNT],
    pub votes_for_challenger: u8,
    pub votes_for_respondent: u8,
    pub votes_mask: u8,
    pub status: DisputeStatus,
    pub deadline_ts: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ReputationProfile {
    pub owner: Pubkey,
    pub bounties_completed: u64,
    pub bounties_rejected: u64,
    pub total_earned: u64,
    pub disputes_won: u64,
    pub disputes_lost: u64,
    pub overturned_reviews: u64,
    pub reputation_score: i64,
    pub bump: u8,
}
