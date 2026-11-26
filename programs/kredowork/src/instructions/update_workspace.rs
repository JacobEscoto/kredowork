use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::BountyError;
use crate::state::WorkspaceConfig;

pub fn handler(ctx: Context<UpdateWorkspace>, params: UpdateWorkspaceParams) -> Result<()> {
    let workspace = &mut ctx.accounts.workspace;

    if let Some(challenge_window_secs) = params.challenge_window_secs {
        require!(challenge_window_secs > 0, BountyError::InvalidWindowDuration);
        workspace.challenge_window_secs = challenge_window_secs;
    }

    if let Some(review_timeout_secs) = params.review_timeout_secs {
        require!(review_timeout_secs > 0, BountyError::InvalidWindowDuration);
        workspace.review_timeout_secs = review_timeout_secs;
    }

    if let Some(reviewers) = params.reviewers {
        require!(
            reviewers.len() <= MAX_REVIEWERS,
            BountyError::TooManyReviewers
        );
        require!(
            usize::from(workspace.quorum_threshold) <= reviewers.len(),
            BountyError::QuorumExceedsReviewers
        );

        for (i, reviewer) in reviewers.iter().enumerate() {
            require!(
                !reviewers[i + 1..].contains(reviewer),
                BountyError::DuplicateReviewer
            );
        }

        workspace.reviewers = reviewers;
        workspace.reviewers_epoch = workspace
            .reviewers_epoch
            .checked_add(1)
            .ok_or(BountyError::MathOverflow)?;
    }

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct UpdateWorkspaceParams {
    pub challenge_window_secs: Option<i64>,
    pub review_timeout_secs: Option<i64>,
    pub reviewers: Option<Vec<Pubkey>>,
}

#[derive(Accounts)]
pub struct UpdateWorkspace<'info> {
    #[account(
        mut,
        has_one = authority,
        seeds = [
            WORKSPACE_SEED,
            workspace.authority.as_ref(),
            &workspace.workspace_id.to_le_bytes()
        ],
        bump = workspace.bump
    )]
    pub workspace: Account<'info, WorkspaceConfig>,

    pub authority: Signer<'info>,
}
