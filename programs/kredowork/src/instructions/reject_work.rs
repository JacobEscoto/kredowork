use crate::constants::*;
use crate::state::*;
use crate::BountyError;
use anchor_lang::prelude::*;
use crate::instructions::reputation::record_bounty_rejected;

/// A registered reviewer rejects a submitted work, resetting the bounty to `Rejected`
/// so that another contributor can claim it (up to `max_submission_attempts`).
/// The reviewer's index bit in `approvals_mask` is NOT written — masks are only
/// meaningful during the approval flow and are reset when the bounty goes back to `Open`.
pub fn handler(ctx: Context<RejectWork>, bounty_id: u64) -> Result<()> {
    let workspace = &ctx.accounts.workspace;
    require!(!workspace.is_paused, BountyError::WorkspacePaused);

    let reviewer_key = ctx.accounts.reviewer.key();
    require!(
        workspace.reviewers.contains(&reviewer_key),
        BountyError::UnauthorizedReviewer
    );

    let bounty = &mut ctx.accounts.bounty;
    require!(bounty.bounty_id == bounty_id, BountyError::BountyIdMismatch);
    require!(
        bounty.status == BountyStatus::Submitted,
        BountyError::InvalidStateTransition
    );

    // Prevent the submitter from self-rejecting (same guard as self-approval).
    let claimant = bounty.claimant.ok_or(BountyError::InvalidClaimant)?;
    require!(
        claimant != reviewer_key,
        BountyError::SelfApprovalNotAllowed
    );

    // Reset submission state so a new contributor can try.
    let clock = Clock::get()?;
    let window_ends_at = clock
        .unix_timestamp
        .checked_add(workspace.challenge_window_secs)
        .ok_or(BountyError::MathOverflow)?;

    bounty.rejected_claimant = Some(claimant);
    bounty.rejected_by = Some(reviewer_key);

    if let Some(ref reputation) = ctx.accounts.contributor_reputation {
        let expected_reputation = Pubkey::find_program_address(
            &[REPUTATION_SEED, claimant.as_ref()],
            &crate::ID,
        )
        .0;
        require!(
            reputation.key() == expected_reputation,
            BountyError::InvalidClaimant
        );
    }

    if let Some(ref mut reputation) = ctx.accounts.contributor_reputation {
        record_bounty_rejected(reputation);
    }

    bounty.status = BountyStatus::Rejected;
    bounty.submission_attempts = bounty
        .submission_attempts
        .checked_add(1)
        .ok_or(BountyError::MathOverflow)?;
    bounty.claimant = None;
    bounty.delivery_hash = None;
    bounty.submitted_at_ts = None;
    bounty.approvals_count = 0;
    bounty.approvals_mask = 0;
    bounty.window_ends_at_ts = Some(window_ends_at);

    Ok(())
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct RejectWork<'info> {
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

    /// Rejected claimant reputation profile (optional): if `Some` is provided,
    /// validates that its address matches the PDA `[REPUTATION_SEED, claimant]`.
    pub contributor_reputation: Option<Account<'info, ReputationProfile>>,
}
