use crate::constants::*;
use crate::state::*;
use crate::BountyError;
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<SubmitWork>, bounty_id: u64, delivery_hash: [u8; 32]) -> Result<()> {
    let workspace = &ctx.accounts.workspace;
    require!(!workspace.is_paused, BountyError::WorkspacePaused);

    let clock = Clock::get()?;
    let bounty = &mut ctx.accounts.bounty;
    require!(
        bounty.bounty_id == bounty_id,
        BountyError::InvalidStateTransition
    );

    require!(
        matches!(bounty.status, BountyStatus::Open | BountyStatus::Claimed),
        BountyError::InvalidStateTransition
    );

    require!(
        clock.unix_timestamp <= bounty.deadline_ts,
        BountyError::WindowExpired
    );

    bounty.claimant = Some(ctx.accounts.contributor.key());
    bounty.delivery_hash = Some(delivery_hash);
    bounty.status = BountyStatus::Submitted;
    bounty.submitted_at_ts = Some(clock.unix_timestamp);
    bounty.approvals_count = 0;

    Ok(())
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct SubmitWork<'info> {
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

    pub contributor: Signer<'info>,
}
