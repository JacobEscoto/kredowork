use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::*;
use crate::errors::BountyError;
use crate::instructions::dispute::{
    calculate_bps_amount, checked_add_amount, checked_sub_amount, require_bounty_id,
    require_bounty_status, require_dispute_status, require_not_paused, split_dispute_bond,
};
use crate::state::*;

pub fn handler<'info>(ctx: Context<'info, ResolveDispute<'info>>, bounty_id: u64) -> Result<()> {
    let workspace = &ctx.accounts.workspace;
    require_not_paused(workspace)?;

    let bounty = &mut ctx.accounts.bounty;
    require_bounty_id(bounty, bounty_id)?;
    require_bounty_status(bounty, BountyStatus::Disputed)?;

    let dispute = &mut ctx.accounts.dispute;
    require_dispute_status(dispute, DisputeStatus::Open)?;

    let clock = Clock::get()?;
    let majority = (ARBITERS_COUNT / 2 + 1) as u8;
    let decided = dispute.votes_for_challenger >= majority
        || dispute.votes_for_respondent >= majority
        || clock.unix_timestamp > dispute.deadline_ts;
    require!(decided, BountyError::WindowNotExpired);

    let challenger_won = dispute.votes_for_challenger >= dispute.votes_for_respondent;
    let (winner_key, loser_key) = if challenger_won {
        (dispute.challenger, dispute.respondent)
    } else {
        (dispute.respondent, dispute.challenger)
    };

    require_keys_eq!(
        ctx.accounts.winner.key(),
        winner_key,
        BountyError::InvalidClaimant
    );
    require_keys_eq!(
        ctx.accounts.loser.key(),
        loser_key,
        BountyError::InvalidClaimant
    );

    // 1. Split the locked dispute bond: 70% to the winner, 30% to the arbitrators.
    let total_bond = checked_add_amount(dispute.challenge_bond, dispute.defense_bond)?;
    let (winner_total, per_arbiter) = split_dispute_bond(total_bond)?;

    let dispute_key = dispute.key();
    let (_, dispute_vault_bump) =
        Pubkey::find_program_address(&[DISPUTE_VAULT_SEED, dispute_key.as_ref()], ctx.program_id);
    let dispute_vault_seeds: &[&[&[u8]]] = &[&[
        DISPUTE_VAULT_SEED,
        dispute_key.as_ref(),
        &[dispute_vault_bump],
    ]];

    if total_bond > 0 {
        if winner_total > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.key(),
                    Transfer {
                        from: ctx.accounts.dispute_vault.to_account_info(),
                        to: ctx.accounts.winner.to_account_info(),
                    },
                    dispute_vault_seeds,
                ),
                winner_total,
            )?;
        }

        if per_arbiter > 0 {
            require!(
                ctx.remaining_accounts.len() >= ARBITERS_COUNT,
                BountyError::UnauthorizedArbiter
            );
            for arbiter_info in ctx.remaining_accounts.iter().take(ARBITERS_COUNT) {
                require!(
                    dispute.arbiters.contains(&arbiter_info.key()),
                    BountyError::UnauthorizedArbiter
                );
                system_program::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.system_program.key(),
                        Transfer {
                            from: ctx.accounts.dispute_vault.to_account_info(),
                            to: arbiter_info.to_account_info(),
                        },
                        dispute_vault_seeds,
                    ),
                    per_arbiter,
                )?;
            }
        }
    }

    // 2. Settle the bounty reward: winner is the claimant (payout) or the sponsor (refund).
    let claimant = bounty.claimant.ok_or(BountyError::InvalidClaimant)?;
    let reward = bounty.reward_amount;
    let bounty_key = bounty.key();
    let vault_bump = bounty.vault_bump;
    let bounty_vault_seeds: &[&[&[u8]]] = &[&[VAULT_SEED, bounty_key.as_ref(), &[vault_bump]]];

    if reward > 0 {
        if winner_key == claimant {
            let fee_amount = calculate_bps_amount(reward, workspace.fee_bps)?;
            let payout = checked_sub_amount(reward, fee_amount)?;

            if payout > 0 {
                system_program::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.system_program.key(),
                        Transfer {
                            from: ctx.accounts.bounty_vault.to_account_info(),
                            to: ctx.accounts.winner.to_account_info(),
                        },
                        bounty_vault_seeds,
                    ),
                    payout,
                )?;
            }
            if fee_amount > 0 {
                system_program::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.system_program.key(),
                        Transfer {
                            from: ctx.accounts.bounty_vault.to_account_info(),
                            to: ctx.accounts.fee_recipient.to_account_info(),
                        },
                        bounty_vault_seeds,
                    ),
                    fee_amount,
                )?;
            }
            bounty.status = BountyStatus::Completed;
        } else {
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.key(),
                    Transfer {
                        from: ctx.accounts.bounty_vault.to_account_info(),
                        to: ctx.accounts.sponsor.to_account_info(),
                    },
                    bounty_vault_seeds,
                ),
                reward,
            )?;
            bounty.status = BountyStatus::Rejected;
        }
    }

    // Clear funds and windows so no disputed or premium lamports remain locked.
    bounty.reward_amount = 0;
    bounty.locked_bond = 0;
    bounty.window_ends_at_ts = None;

    dispute.status = if challenger_won {
        DisputeStatus::ResolvedForChallenger
    } else {
        DisputeStatus::ResolvedForRespondent
    };

    Ok(())
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct ResolveDispute<'info> {
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

    #[account(
        mut,
        has_one = bounty,
        seeds = [DISPUTE_SEED, bounty.key().as_ref()],
        bump = dispute.bump
    )]
    pub dispute: Account<'info, DisputeAccount>,

    /// CHECK: PDA vault that holds the bounty reward lamports.
    #[account(
        mut,
        seeds = [VAULT_SEED, bounty.key().as_ref()],
        bump = bounty.vault_bump
    )]
    pub bounty_vault: UncheckedAccount<'info>,

    /// CHECK: PDA vault that holds the dispute bond lamports.
    #[account(
        mut,
        seeds = [DISPUTE_VAULT_SEED, dispute.key().as_ref()],
        bump
    )]
    pub dispute_vault: UncheckedAccount<'info>,

    /// CHECK: Validated against `bounty.sponsor` via the winner/loser checks in the handler.
    #[account(mut)]
    pub sponsor: UncheckedAccount<'info>,

    /// CHECK: Dispute winner receiving bond share and reward if claimant.
    #[account(mut)]
    pub winner: UncheckedAccount<'info>,

    /// CHECK: Dispute loser validated on-chain against the dispute parties.
    pub loser: UncheckedAccount<'info>,

    /// CHECK: Fee recipient matching workspace authority.
    #[account(
        mut,
        address = workspace.authority
    )]
    pub fee_recipient: UncheckedAccount<'info>,

    /// CHECK: Only the workspace authority can resolve a dispute.
    #[account(
        address = workspace.authority
    )]
    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,
}
