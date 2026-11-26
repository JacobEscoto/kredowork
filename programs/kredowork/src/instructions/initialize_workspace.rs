use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::*;
use crate::state::WorkspaceConfig;

pub fn handler(ctx: Context<InitializeWorkspace>, params: WorkspaceParams) -> Result<()> {
    require!(
        params.reviewers.len() <= MAX_REVIEWERS,
        BountyError::TooManyReviewers
    );
    require!(params.quorum_threshold > 0, BountyError::InvalidQuorumThreshold);
    require!(params.max_submission_attempts > 0, BountyError::InvalidMaxSubmissionAttempts);
    require!(
        usize::from(params.quorum_threshold) <= params.reviewers.len(),
        BountyError::QuorumExceedsReviewers
    );

    for (i, reviewer) in params.reviewers.iter().enumerate() {
        require!(
            !params.reviewers[i + 1..].contains(reviewer),
            BountyError::DuplicateReviewer
        );
    }

    require!(
        params.challenge_window_secs > 0,
        BountyError::InvalidWindowDuration
    );
    require!(params.review_timeout_secs > 0, BountyError::InvalidWindowDuration);
    require!(
        params.fee_bps <= 10_000 && params.bond_bps <= 10_000,
        BountyError::InvalidBps
    );

    let workspace = &mut ctx.accounts.workspace;
    workspace.authority = ctx.accounts.authority.key();
    workspace.workspace_id = params.workspace_id;
    workspace.bounty_count = 0;
    workspace.quorum_threshold = params.quorum_threshold;
    workspace.max_submission_attempts = params.max_submission_attempts;
    workspace.challenge_window_secs = params.challenge_window_secs;
    workspace.review_timeout_secs = params.review_timeout_secs;
    workspace.fee_bps = params.fee_bps;
    workspace.bond_bps = params.bond_bps;
    workspace.reviewers_epoch = 0;
    workspace.reviewers = params.reviewers;
    workspace.is_paused = false;
    workspace.bump = ctx.bumps.workspace;

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WorkspaceParams {
    pub workspace_id: u64,
    pub quorum_threshold: u8,
    pub max_submission_attempts: u8,
    pub challenge_window_secs: i64,
    pub review_timeout_secs: i64,
    pub fee_bps: u16,
    pub bond_bps: u16,
    pub reviewers: Vec<Pubkey>,
}

#[derive(Accounts)]
#[instruction(params: WorkspaceParams)]
pub struct InitializeWorkspace<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + WorkspaceConfig::INIT_SPACE,
        seeds = [
            WORKSPACE_SEED, 
            authority.key().as_ref(), 
            &params.workspace_id.to_le_bytes()
        ],
        bump
    )]
    pub workspace: Account<'info, WorkspaceConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
