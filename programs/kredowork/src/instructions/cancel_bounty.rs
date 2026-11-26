use crate::constants::*;
use crate::state::*;
use crate::BountyError;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

pub fn handler(ctx: Context<CancelBounty>, bounty_id: u64) -> Result<()> {
    let bounty = &mut ctx.accounts.bounty;
    require!(
        bounty.bounty_id == bounty_id,
        BountyError::BountyIdMismatch
    );
    require!(
        bounty.status == BountyStatus::Open,
        BountyError::InvalidStateTransition
    );

    let refund_amount = bounty.reward_amount;
    if refund_amount > 0 {
        let bounty_key = bounty.key();
        let vault_bump = bounty.vault_bump;
        let signer_seeds: &[&[&[u8]]] = &[&[VAULT_SEED, bounty_key.as_ref(), &[vault_bump]]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.sponsor.to_account_info(),
        };

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                cpi_accounts,
                signer_seeds,
            ),
            refund_amount,
        )?;
    }

    bounty.reward_amount = 0;
    bounty.status = BountyStatus::Cancelled;
    bounty.window_ends_at_ts = None;
    Ok(())
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct CancelBounty<'info> {
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
        has_one = sponsor,
        seeds = [
            BOUNTY_SEED,
            workspace.key().as_ref(),
            &bounty_id.to_le_bytes()
        ],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, BountyAccount>,

    /// CHECK: PDA vault that holds the bounty's lamports; signed using VAULT_SEED + bounty.key()
    #[account(
        mut,
        seeds = [VAULT_SEED, bounty.key().as_ref()],
        bump = bounty.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(mut)]
    pub sponsor: Signer<'info>,

    pub system_program: Program<'info, System>,
}
