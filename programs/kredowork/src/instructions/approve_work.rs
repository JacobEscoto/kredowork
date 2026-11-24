use crate::constants::*;
use crate::state::*;
use crate::BountyError;
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<ApproveWork>, bounty_id: u64) -> Result<()> {
    let workspace = &ctx.accounts.workspace;
    require!(!workspace.is_paused, BountyError::WorkspacePaused);
    require!(
        workspace.quorum_threshold > 0,
        BountyError::InvalidQuorumThreshold
    );

    let reviewer_key = ctx.accounts.reviewer.key();
    let reviewer_idx = workspace
        .reviewers
        .iter()
        .position(|r| r == &reviewer_key)
        .ok_or(BountyError::UnauthorizedReviewer)?;

    require!(reviewer_idx < 8, BountyError::UnauthorizedReviewer);

    let bounty = &mut ctx.accounts.bounty;
    require!(
        bounty.bounty_id == bounty_id,
        BountyError::BountyIdMismatch
    );
    require!(
        bounty.status == BountyStatus::Submitted,
        BountyError::InvalidStateTransition
    );

    if let Some(claimant) = bounty.claimant {
        require!(
            claimant != reviewer_key,
            BountyError::SelfApprovalNotAllowed
        );
    }

    let mask_bit: u8 = 1u8 << (reviewer_idx as u8);
    require!(
        (bounty.approvals_mask & mask_bit) == 0,
        BountyError::DuplicateAction
    );

    bounty.approvals_mask |= mask_bit;
    bounty.approvals_count = bounty
        .approvals_count
        .checked_add(1)
        .ok_or(BountyError::MathOverflow)?;

    if bounty.approvals_count >= workspace.quorum_threshold {
        let clock = Clock::get()?;
        bounty.status = BountyStatus::PreApproved;
        bounty.window_ends_at_ts = Some(
            clock
                .unix_timestamp
                .checked_add(workspace.challenge_window_secs)
                .ok_or(BountyError::MathOverflow)?,
        );
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct ApproveWork<'info> {
    #[account(
        seeds = [WORKSPACE_SEED, workspace.authority.as_ref(), &workspace.workspace_id.to_le_bytes()],
        bump = workspace.bump
    )]
    pub workspace: Account<'info, WorkspaceConfig>,

    #[account(
        mut,
        has_one = workspace,
        seeds = [
            BOUNTY_SEED,
            workspace.key().as_ref(),
            &bounty_id.to_le_bytes()
        ],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, BountyAccount>,

    pub reviewer: Signer<'info>,
}
