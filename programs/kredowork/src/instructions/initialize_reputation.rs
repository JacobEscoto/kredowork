use anchor_lang::prelude::*;

use crate::constants::REPUTATION_SEED;
use crate::state::ReputationProfile;

pub fn handler<'info>(
    ctx: Context<'info, InitializeReputation<'info>>,
) -> Result<()> {
    let profile = &mut ctx.accounts.profile;
    profile.owner = ctx.accounts.owner.key();
    profile.bounties_completed = 0;
    profile.bounties_rejected = 0;
    profile.total_earned = 0;
    profile.disputes_won = 0;
    profile.disputes_lost = 0;
    profile.overturned_reviews = 0;
    profile.reputation_score = 0;
    profile.bump = ctx.bumps.profile;

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeReputation<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + ReputationProfile::INIT_SPACE,
        seeds = [REPUTATION_SEED, owner.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, ReputationProfile>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}
