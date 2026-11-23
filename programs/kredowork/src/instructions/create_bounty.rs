use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::*;
use crate::state::*;
use crate::BountyError;

pub fn handler(
    ctx: Context<CreateBounty>,
    reward_amount: u64,
    spec_hash: [u8; 32],
    deadline_ts: i64,
) -> Result<()> {
    let workspace = &mut ctx.accounts.workspace;
    require!(!workspace.is_paused, BountyError::WorkspacePaused);
    require!(reward_amount > 0, BountyError::InvalidRewardAmount);

    let clock = Clock::get()?;
    require!(
        deadline_ts > clock.unix_timestamp,
        BountyError::InvalidDeadline
    );

    let bounty_id = workspace.bounty_count;
    workspace.bounty_count = bounty_id.checked_add(1).ok_or(BountyError::MathOverflow)?;

    let cpi_accounts = Transfer {
        from: ctx.accounts.sponsor.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.system_program.key(), cpi_accounts);
    system_program::transfer(cpi_ctx, reward_amount)?;

    let bounty = &mut ctx.accounts.bounty;
    bounty.workspace = workspace.key();
    bounty.sponsor = ctx.accounts.sponsor.key();
    bounty.claimant = None;
    bounty.bounty_id = bounty_id;
    bounty.reward_amount = reward_amount;
    bounty.locked_bond = 0;
    bounty.spec_hash = spec_hash;
    bounty.delivery_hash = None;
    bounty.status = BountyStatus::Open;
    bounty.deadline_ts = deadline_ts;
    bounty.submitted_at_ts = None;
    bounty.window_ends_at_ts = None;
    bounty.approvals_count = 0;
    bounty.bump = ctx.bumps.bounty;
    bounty.vault_bump = ctx.bumps.vault;
    Ok(())
}

#[derive(Accounts)]
pub struct CreateBounty<'info> {
    #[account(
        mut,
        seeds = [WORKSPACE_SEED, workspace.authority.as_ref(), &workspace.workspace_id.to_le_bytes()],
        bump = workspace.bump
    )]
    pub workspace: Account<'info, WorkspaceConfig>,

    #[account(
        init,
        payer = sponsor,
        space = 8 + BountyAccount::INIT_SPACE,
        seeds = [
            BOUNTY_SEED,
            workspace.key().as_ref(),
            &workspace.bounty_count.to_le_bytes()
        ],
        bump
    )]
    pub bounty: Account<'info, BountyAccount>,

    /// CHECK: Isolated PDA vault for safeguarding bounty funds; validation will occur upon fund
    /// transfer.
    #[account(
        mut,
        seeds = [VAULT_SEED, bounty.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub sponsor: Signer<'info>,

    pub system_program: Program<'info, System>,
}
