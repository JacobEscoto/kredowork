use anchor_lang::prelude::*;

use crate::state::ReputationProfile;

/// Increments `bounties_completed` by 1, adds `payout_amount` to `total_earned`,
/// and adds 10 to `reputation_score` using saturating arithmetic.
pub fn record_bounty_completed(profile: &mut Account<ReputationProfile>, payout_amount: u64) {
    profile.bounties_completed = profile.bounties_completed.saturating_add(1);
    profile.total_earned = profile.total_earned.saturating_add(payout_amount);
    profile.reputation_score = profile.reputation_score.saturating_add(10);
}

/// Increments `bounties_rejected` by 1 and subtracts 5 from `reputation_score`
/// using saturating arithmetic.
pub fn record_bounty_rejected(profile: &mut Account<ReputationProfile>) {
    profile.bounties_rejected = profile.bounties_rejected.saturating_add(1);
    profile.reputation_score = profile.reputation_score.saturating_sub(5);
}

/// Records the outcome of a dispute using saturating arithmetic:
/// - winner: `disputes_won` +1 and `reputation_score` +15
/// - loser: `disputes_lost` +1 and `reputation_score` -10
/// - if `challenger_won` and reviewer profile is present: `overturned_reviews` +1
/// - if `completed_payout` is `Some(amount)` for the winner: `bounties_completed` +1
///   and `total_earned` +amount
pub fn record_dispute_outcome(
    winner_profile: &mut Account<ReputationProfile>,
    loser_profile: &mut Account<ReputationProfile>,
    overturned_reviewer_profile: Option<&mut Account<ReputationProfile>>,
    challenger_won: bool,
    completed_payout: Option<u64>,
) {
    winner_profile.disputes_won = winner_profile.disputes_won.saturating_add(1);
    winner_profile.reputation_score = winner_profile.reputation_score.saturating_add(15);

    loser_profile.disputes_lost = loser_profile.disputes_lost.saturating_add(1);
    loser_profile.reputation_score = loser_profile.reputation_score.saturating_sub(10);

    if challenger_won {
        if let Some(reviewer) = overturned_reviewer_profile {
            reviewer.overturned_reviews = reviewer.overturned_reviews.saturating_add(1);
        }
    }

    if let Some(amount) = completed_payout {
        winner_profile.bounties_completed = winner_profile.bounties_completed.saturating_add(1);
        winner_profile.total_earned = winner_profile.total_earned.saturating_add(amount);
    }
}
