pub mod constants;
pub mod errors;
pub mod state;

use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use constants::*;
use errors::BountyError;
use state::*;

declare_id!("ArDpfoTVD98T1NAoGG3XZw9NagP5sja63YzsfbSQ9QsB");

#[program]
pub mod kredowork {
    use super::*;

    pub fn initialize_workspace(
        ctx: Context<InitializeWorkspace>,
        workspace_id: u64,
        quorum_threshold: u8,
        challenge_window_secs: i64,
        review_timeout_secs: i64,
        fee_bps: u16,
        bond_bps: u16,
        reviewers: Vec<Pubkey>,
    ) -> Result<()> {
        require!(
            reviewers.len() <= MAX_REVIEWERS,
            BountyError::TooManyReviewers
        );
        require!(quorum_threshold > 0, BountyError::QuorumNotReached);
        require!(
            usize::from(quorum_threshold) <= reviewers.len(),
            BountyError::QuorumNotReached
        );
        require!(challenge_window_secs > 0, BountyError::InvalidDeadline);
        require!(review_timeout_secs > 0, BountyError::InvalidDeadline);

        let workspace = &mut ctx.accounts.workspace;
        workspace.authority = ctx.accounts.authority.key();
        workspace.workspace_id = workspace_id;
        workspace.bounty_count = 0;
        workspace.quorum_threshold = quorum_threshold;
        workspace.challenge_window_secs = challenge_window_secs;
        workspace.review_timeout_secs = review_timeout_secs;
        workspace.fee_bps = fee_bps;
        workspace.bond_bps = bond_bps;
        workspace.reviewers = reviewers;
        workspace.is_paused = false;
        workspace.bump = ctx.bumps.workspace;
        Ok(())
    }

    pub fn create_bounty(
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

    pub fn submit_work(ctx: Context<SubmitWork>, delivery_hash: [u8; 32]) -> Result<()> {
        let workspace = &ctx.accounts.workspace;
        require!(!workspace.is_paused, BountyError::WorkspacePaused);

        let clock = Clock::get()?;
        let bounty = &mut ctx.accounts.bounty;

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

    pub fn approve_work(ctx: Context<ApproveWork>) -> Result<()> {
        let workspace = &ctx.accounts.workspace;
        require!(!workspace.is_paused, BountyError::WorkspacePaused);
        require!(
            workspace.quorum_threshold > 0,
            BountyError::QuorumNotReached
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

    pub fn finalize_payout(ctx: Context<FinalizePayout>) -> Result<()> {
        let workspace = &ctx.accounts.workspace;
        require!(!workspace.is_paused, BountyError::WorkspacePaused);

        let bounty = &mut ctx.accounts.bounty;
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
            BountyError::SelfApprovalNotAllowed
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

        bounty.status = BountyStatus::Completed;
        bounty.window_ends_at_ts = None;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(workspace_id: u64)]
pub struct InitializeWorkspace<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + WorkspaceConfig::INIT_SPACE,
        seeds = [WORKSPACE_SEED, authority.key().as_ref(), &workspace_id.to_le_bytes()],
        bump
    )]
    pub workspace: Account<'info, WorkspaceConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
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

#[derive(Accounts)]
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
            &bounty.bounty_id.to_le_bytes()
        ],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, BountyAccount>,

    pub contributor: Signer<'info>,
}

#[derive(Accounts)]
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
            &bounty.bounty_id.to_le_bytes()
        ],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, BountyAccount>,

    pub reviewer: Signer<'info>,
}

#[derive(Accounts)]
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
            &bounty.bounty_id.to_le_bytes()
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

    /// CHECK: Validated against `workspace.authority` to receive the protocol commission.
    #[account(
        mut,
        address = workspace.authority
    )]
    pub fee_recipient: UncheckedAccount<'info>,

    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,
}
