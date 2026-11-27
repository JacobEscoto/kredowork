use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::*;
use crate::state::*;
use crate::BountyError;
use crate::instructions::reputation::record_bounty_completed;

pub fn handler(ctx: Context<FinalizePayout>, bounty_id: u64) -> Result<()> {
    let workspace = &ctx.accounts.workspace;
    require!(!workspace.is_paused, BountyError::WorkspacePaused);

    let bounty = &mut ctx.accounts.bounty;
    require!(
        bounty.bounty_id == bounty_id,
        BountyError::BountyIdMismatch
    );
    require!(
        bounty.status == BountyStatus::PreApproved,
        BountyError::InvalidStateTransition
    );

    let clock = Clock::get()?;
    let window_ends_at = bounty
        .window_ends_at_ts
        .ok_or(BountyError::InvalidStateTransition)?;
    require!(
        clock.unix_timestamp >= window_ends_at,
        BountyError::WindowNotExpired
    );

    let claimant = bounty.claimant.ok_or(BountyError::InvalidStateTransition)?;
    require_keys_eq!(
        ctx.accounts.contributor.key(),
        claimant,
        BountyError::InvalidClaimant
    );

    let total_reward = bounty.reward_amount;
    let fee_amount = total_reward
        .checked_mul(u64::from(workspace.fee_bps))
        .ok_or(BountyError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(BountyError::MathOverflow)?;

    let payout_amount = total_reward
        .checked_sub(fee_amount)
        .ok_or(BountyError::MathOverflow)?;

    let bounty_key = bounty.key();
    let vault_bump = bounty.vault_bump;
    let signer_seeds: &[&[&[u8]]] = &[&[VAULT_SEED, bounty_key.as_ref(), &[vault_bump]]];

    if payout_amount > 0 {
        let cpi_to_contributor = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.contributor.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                cpi_to_contributor,
                signer_seeds,
            ),
            payout_amount,
        )?;
    }

    if fee_amount > 0 {
        let cpi_to_fee = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.fee_recipient.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                cpi_to_fee,
                signer_seeds,
            ),
            fee_amount,
        )?;
    }

    bounty.reward_amount = 0;
    bounty.status = BountyStatus::Completed;
    bounty.window_ends_at_ts = None;

    if let Some(ref mut reputation) = ctx.accounts.contributor_reputation {
        record_bounty_completed(reputation, payout_amount);
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct FinalizePayout<'info> {
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

    /// CHECK: PDA vault that holds the bounty's lamports; signed using VAULT_SEED + bounty.key().
    #[account(
        mut,
        seeds = [VAULT_SEED, bounty.key().as_ref()],
        bump = bounty.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    /// CHECK: Validated against `bounty.claimant` in the instruction.
    #[account(mut)]
    pub contributor: UncheckedAccount<'info>,

    /// Contributor reputation profile (optional): validated against
    /// `[REPUTATION_SEED, contributor.key()]` only if `Some` is provided.
    #[account(
        mut,
        seeds = [REPUTATION_SEED, contributor.key().as_ref()],
        bump
    )]
    pub contributor_reputation: Option<Account<'info, ReputationProfile>>,

    /// CHECK: Validated against `workspace.authority` to receive the protocol commission.
    #[account(
        mut,
        address = workspace.authority
    )]
    pub fee_recipient: UncheckedAccount<'info>,

    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,
}
