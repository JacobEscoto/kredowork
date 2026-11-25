use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::*;
use crate::errors::BountyError;
use crate::instructions::dispute::{
    checked_add_amount, require_bounty_id, require_dispute_status, require_not_paused,
    require_window_open,
};
use crate::state::*;

pub fn handler(
    ctx: Context<SubmitDefense>,
    bounty_id: u64,
    defense_evidence_hash: [u8; 32],
) -> Result<()> {
    let workspace = &ctx.accounts.workspace;
    require_not_paused(workspace)?;

    let bounty = &mut ctx.accounts.bounty;
    require_bounty_id(bounty, bounty_id)?;

    let dispute = &mut ctx.accounts.dispute;
    require_dispute_status(dispute, DisputeStatus::Open)?;
    require!(
        dispute.defense_evidence_hash.is_none(),
        BountyError::DuplicateAction
    );

    let clock = Clock::get()?;
    require_window_open(&clock, dispute.deadline_ts)?;

    let bond_amount = dispute.challenge_bond;
    if bond_amount > 0 {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.respondent.to_account_info(),
                to: ctx.accounts.dispute_vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, bond_amount)?;
    }

    dispute.defense_bond = bond_amount;
    dispute.defense_evidence_hash = Some(defense_evidence_hash);
    bounty.locked_bond = checked_add_amount(bounty.locked_bond, bond_amount)?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct SubmitDefense<'info> {
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

    #[account(
        mut,
        has_one = bounty,
        has_one = respondent,
        seeds = [DISPUTE_SEED, bounty.key().as_ref()],
        bump = dispute.bump
    )]
    pub dispute: Account<'info, DisputeAccount>,

    /// CHECK: PDA vault holding dispute bonds.
    #[account(
        mut,
        seeds = [DISPUTE_VAULT_SEED, dispute.key().as_ref()],
        bump
    )]
    pub dispute_vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub respondent: Signer<'info>,

    pub system_program: Program<'info, System>,
}
