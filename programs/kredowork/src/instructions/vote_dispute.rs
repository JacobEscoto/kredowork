use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::BountyError;
use crate::instructions::dispute::{
    increment_count, require_bounty_id, require_dispute_status, require_not_paused,
    require_window_open,
};
use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DisputeVoteSide {
    Challenger,
    Respondent,
}

pub fn handler(ctx: Context<VoteDispute>, bounty_id: u64, side: DisputeVoteSide) -> Result<()> {
    let workspace = &ctx.accounts.workspace;
    require_not_paused(workspace)?;

    let bounty = &ctx.accounts.bounty;
    require_bounty_id(bounty, bounty_id)?;

    let dispute = &mut ctx.accounts.dispute;
    require_dispute_status(dispute, DisputeStatus::Open)?;

    let clock = Clock::get()?;
    require_window_open(&clock, dispute.deadline_ts)?;

    let arbiter_key = ctx.accounts.arbiter.key();
    let arbiter_idx = dispute
        .arbiters
        .iter()
        .position(|a| *a == arbiter_key)
        .ok_or(BountyError::UnauthorizedArbiter)? as u8;
    let mask_bit: u8 = 1u8 << arbiter_idx;
    require!(
        (dispute.votes_mask & mask_bit) == 0,
        BountyError::DuplicateAction
    );
    dispute.votes_mask |= mask_bit;

    match side {
        DisputeVoteSide::Challenger => {
            dispute.votes_for_challenger = increment_count(dispute.votes_for_challenger)?;
        }
        DisputeVoteSide::Respondent => {
            dispute.votes_for_respondent = increment_count(dispute.votes_for_respondent)?;
        }
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct VoteDispute<'info> {
    #[account(
        seeds = [
            WORKSPACE_SEED,
            workspace.authority.as_ref(),
            &workspace.workspace_id.to_le_bytes()
        ],
        bump = workspace.bump
    )]
    pub workspace: Account<'info, WorkspaceConfig>,

    #[account(
        has_one = workspace,
        seeds = [
            BOUNTY_SEED,
            workspace.key().as_ref(),
            &bounty_id.to_le_bytes()
        ],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, BountyAccount>,

    #[account(
        mut,
        has_one = bounty,
        seeds = [DISPUTE_SEED, bounty.key().as_ref()],
        bump = dispute.bump
    )]
    pub dispute: Account<'info, DisputeAccount>,

    pub arbiter: Signer<'info>,
}
