use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::constants::*;
use crate::errors::BountyError;
use crate::instructions::dispute::{
    calculate_bond_amount, require_bounty_id, require_bounty_status, require_not_paused,
    require_window_open, select_dispute_arbiters,
};
use crate::state::*;

pub fn handler(
    ctx: Context<ChallengeBounty>,
    bounty_id: u64,
    challenge_evidence_hash: [u8; 32],
) -> Result<()> {
    let workspace = &ctx.accounts.workspace;
    require_not_paused(workspace)?;

    let bounty = &mut ctx.accounts.bounty;
    require_bounty_id(bounty, bounty_id)?;
    require_bounty_status(bounty, BountyStatus::Rejected)?;

    let clock = Clock::get()?;
    if let Some(window_ends_at) = bounty.window_ends_at_ts {
        require_window_open(&clock, window_ends_at)?;
    }

    let challenger_key = ctx.accounts.challenger.key();
    let respondent_key = ctx.accounts.respondent.key();
    require!(
        challenger_key != respondent_key,
        BountyError::SelfApprovalNotAllowed
    );

    let claimant_key = bounty.rejected_claimant.ok_or(BountyError::InvalidClaimant)?;
    require!(
        challenger_key == claimant_key && respondent_key == bounty.sponsor,
        BountyError::InvalidChallenger
    );

    // Filter eligible candidates by excluding involved parties and workspace reviewers.
    let mut candidates: Vec<Pubkey> = Vec::new();
    for acc in ctx.remaining_accounts.iter() {
        let key = acc.key();
        if key == bounty.sponsor
            || key == challenger_key
            || key == respondent_key
            || key == workspace.authority
            || bounty.rejected_by == Some(key)
            || workspace.reviewers.contains(&key)
            || candidates.contains(&key)
        {
            continue;
        }
        candidates.push(key);
    }

    require!(
        candidates.len() >= MIN_ARBITER_POOL,
        BountyError::UnauthorizedArbiter
    );

    let arbiters = select_dispute_arbiters(
        candidates,
        &clock,
        &bounty.key(),
        &challenger_key,
        &respondent_key,
    )?;

    let challenge_bond = calculate_bond_amount(bounty.reward_amount, workspace.bond_bps)?;

    if challenge_bond > 0 {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.challenger.to_account_info(),
                to: ctx.accounts.dispute_vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, challenge_bond)?;
    }

    let dispute = &mut ctx.accounts.dispute;
    dispute.bounty = bounty.key();
    dispute.challenger = challenger_key;
    dispute.respondent = respondent_key;
    dispute.challenge_bond = challenge_bond;
    dispute.defense_bond = 0;
    dispute.challenge_evidence_hash = challenge_evidence_hash;
    dispute.defense_evidence_hash = None;
    dispute.arbiters = arbiters;
    dispute.votes_for_challenger = 0;
    dispute.votes_for_respondent = 0;
    dispute.votes_mask = 0;
    dispute.status = DisputeStatus::Open;
    dispute.deadline_ts = clock
        .unix_timestamp
        .checked_add(workspace.challenge_window_secs)
        .ok_or(BountyError::MathOverflow)?;
    dispute.bump = ctx.bumps.dispute;

    bounty.locked_bond = challenge_bond;
    bounty.status = BountyStatus::Disputed;
    bounty.window_ends_at_ts = Some(dispute.deadline_ts);

    Ok(())
}

#[derive(Accounts)]
#[instruction(bounty_id: u64)]
pub struct ChallengeBounty<'info> {
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
        init,
        payer = challenger,
        space = 8 + DisputeAccount::INIT_SPACE,
        seeds = [DISPUTE_SEED, bounty.key().as_ref()],
        bump
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
    pub challenger: Signer<'info>,

    /// CHECK: Counterparty validated against bounty sponsor and claimant.
    pub respondent: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
