use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::*;
use crate::errors::BountyError;
use crate::instructions::dispute::{
    calculate_bps_amount, checked_add_amount, checked_sub_amount, require_bounty_id,
    require_bounty_status, require_dispute_status, require_not_paused, split_dispute_bond,
};
use crate::instructions::reputation::record_dispute_outcome;
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

    let challenger_won = dispute.votes_for_challenger > dispute.votes_for_respondent;
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
    let dispute_vault_seeds: &[&[&[u8]]] = &[&[
        DISPUTE_VAULT_SEED,
        dispute_key.as_ref(),
        &[ctx.bumps.dispute_vault],
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
            for (i, arbiter_info) in ctx
                .remaining_accounts
                .iter()
                .take(ARBITERS_COUNT)
                .enumerate()
            {
                require_keys_eq!(
                    arbiter_info.key(),
                    dispute.arbiters[i],
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
    let claimant = bounty
        .rejected_claimant
        .ok_or(BountyError::InvalidClaimant)?;
    let reward = bounty.reward_amount;

    // Validate optional reputation profiles against their PDAs when `Some` is provided.
    if let Some(ref winner_rep) = ctx.accounts.winner_reputation {
        let expected_winner = Pubkey::find_program_address(
            &[REPUTATION_SEED, ctx.accounts.winner.key().as_ref()],
            &crate::ID,
        )
        .0;
        require!(
            winner_rep.key() == expected_winner,
            BountyError::InvalidClaimant
        );
    }
    if let Some(ref loser_rep) = ctx.accounts.loser_reputation {
        let expected_loser = Pubkey::find_program_address(
            &[REPUTATION_SEED, ctx.accounts.loser.key().as_ref()],
            &crate::ID,
        )
        .0;
        require!(
            loser_rep.key() == expected_loser,
            BountyError::InvalidClaimant
        );
    }
    if let Some(ref reviewer_rep) = ctx.accounts.reviewer_reputation {
        let reviewer_key = bounty
            .rejected_by
            .ok_or(BountyError::InvalidClaimant)?;
        let expected_reviewer = Pubkey::find_program_address(
            &[REPUTATION_SEED, reviewer_key.as_ref()],
            &crate::ID,
        )
        .0;
        require!(
            reviewer_rep.key() == expected_reviewer,
            BountyError::InvalidClaimant
        );
    }

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

            // Update reputation profiles for parties involved in the dispute.
            if let (Some(winner_rep), Some(loser_rep)) = (
                &mut ctx.accounts.winner_reputation,
                &mut ctx.accounts.loser_reputation,
            ) {
                let reviewer_rep = ctx.accounts.reviewer_reputation.as_mut();
                record_dispute_outcome(winner_rep, loser_rep, reviewer_rep, challenger_won, Some(payout));
            }
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
        }
    }

    // Clear funds and windows so no disputed or premium lamports remain locked.
    bounty.reward_amount = 0;
    bounty.locked_bond = 0;
    bounty.window_ends_at_ts = None;

    bounty.status = if winner_key == bounty.sponsor {
        BountyStatus::Cancelled
    } else {
        BountyStatus::Completed
    };

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

    /// CHECK: Any signer may resolve a dispute.
    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,

    /// Winner reputation profile (optional): validated against `[REPUTATION_SEED, winner.key()]` in the handler.
    #[account(
        mut,
        seeds = [REPUTATION_SEED, winner.key().as_ref()],
        bump
    )]
    pub winner_reputation: Option<Account<'info, ReputationProfile>>,

    /// Loser reputation profile (optional): validated against `[REPUTATION_SEED, loser.key()]` in the handler.
    #[account(
        mut,
        seeds = [REPUTATION_SEED, loser.key().as_ref()],
        bump
    )]
    pub loser_reputation: Option<Account<'info, ReputationProfile>>,

    /// Reviewer reputation profile who rejected the work (optional): validated against
    /// `[REPUTATION_SEED, bounty.rejected_by()]` in the handler.
    pub reviewer_reputation: Option<Account<'info, ReputationProfile>>,
}
