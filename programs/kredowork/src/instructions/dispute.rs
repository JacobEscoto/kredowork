use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::BountyError;
use crate::state::*;

/// Denominator used by basis point (bps) based fee and bond calculations.
const BPS_DENOMINATOR: u64 = 10_000;

/// Share of the total dispute bond owed to the winning party; the remaining
/// share is split between the arbitrators (remainder included in the winner share).
const DISPUTE_WINNER_SHARE: u64 = 70;

pub fn require_not_paused(workspace: &WorkspaceConfig) -> Result<()> {
    require!(!workspace.is_paused, BountyError::WorkspacePaused);
    Ok(())
}

pub fn require_bounty_id(bounty: &BountyAccount, expected: u64) -> Result<()> {
    require!(bounty.bounty_id == expected, BountyError::BountyIdMismatch);
    Ok(())
}

pub fn require_bounty_status(bounty: &BountyAccount, expected: BountyStatus) -> Result<()> {
    require!(
        bounty.status == expected,
        BountyError::InvalidStateTransition
    );
    Ok(())
}

pub fn require_dispute_status(dispute: &DisputeAccount, expected: DisputeStatus) -> Result<()> {
    require!(
        dispute.status == expected,
        BountyError::InvalidStateTransition
    );
    Ok(())
}

pub fn require_window_open(clock: &Clock, deadline_ts: i64) -> Result<()> {
    require!(
        clock.unix_timestamp <= deadline_ts,
        BountyError::WindowExpired
    );
    Ok(())
}

pub fn require_window_elapsed(clock: &Clock, deadline_ts: i64) -> Result<()> {
    require!(
        clock.unix_timestamp > deadline_ts,
        BountyError::WindowNotExpired
    );
    Ok(())
}

pub fn calculate_bps_amount(amount: u64, bps: u16) -> Result<u64> {
    let product = amount
        .checked_mul(u64::from(bps))
        .ok_or(BountyError::MathOverflow)?;
    Ok(product
        .checked_div(BPS_DENOMINATOR)
        .ok_or(BountyError::MathOverflow)?)
}

pub fn calculate_bond_amount(reward_amount: u64, bond_bps: u16) -> Result<u64> {
    calculate_bps_amount(reward_amount, bond_bps)
}

pub fn checked_add_amount(lhs: u64, rhs: u64) -> Result<u64> {
    Ok(lhs.checked_add(rhs).ok_or(BountyError::MathOverflow)?)
}

pub fn checked_sub_amount(lhs: u64, rhs: u64) -> Result<u64> {
    Ok(lhs.checked_sub(rhs).ok_or(BountyError::MathOverflow)?)
}

pub fn increment_count(current: u8) -> Result<u8> {
    Ok(current.checked_add(1).ok_or(BountyError::MathOverflow)?)
}

/// Splits a total locked bond into the winning party's share and the
/// per-arbitrator share, returning `(winner_total, per_arbiter)`.
pub fn split_dispute_bond(total_bond: u64) -> Result<(u64, u64)> {
    let winner_bond_share = total_bond
        .checked_mul(DISPUTE_WINNER_SHARE)
        .ok_or(BountyError::MathOverflow)?
        .checked_div(100)
        .ok_or(BountyError::MathOverflow)?;

    let arbiters_pool = checked_sub_amount(total_bond, winner_bond_share)?;
    let per_arbiter = arbiters_pool
        .checked_div(ARBITERS_COUNT as u64)
        .ok_or(BountyError::MathOverflow)?;
    let distributed_to_arbiters = per_arbiter
        .checked_mul(ARBITERS_COUNT as u64)
        .ok_or(BountyError::MathOverflow)?;
    let remainder = checked_sub_amount(arbiters_pool, distributed_to_arbiters)?;
    let winner_total = winner_bond_share
        .checked_add(remainder)
        .ok_or(BountyError::MathOverflow)?;

    Ok((winner_total, per_arbiter))
}

/// Pseudo-randomly selects `ARBITERS_COUNT` arbitrators from the candidate pool.
pub fn select_dispute_arbiters(
    mut candidates: Vec<Pubkey>,
    clock: &Clock,
    bounty_key: &Pubkey,
    challenger: &Pubkey,
    respondent: &Pubkey,
) -> Result<[Pubkey; ARBITERS_COUNT]> {
    if candidates.len() < ARBITERS_COUNT {
        return Err(BountyError::UnauthorizedArbiter.into());
    }

    let mut arbiters = [Pubkey::default(); ARBITERS_COUNT];
    for (slot_idx, arbiter_slot) in arbiters.iter_mut().enumerate() {
        let digest = derive_arbiter_seed(
            clock.slot,
            clock.unix_timestamp,
            bounty_key,
            challenger,
            respondent,
            slot_idx as u8,
        );
        let mut raw_bytes = [0u8; 8];
        raw_bytes.copy_from_slice(&digest[..8]);
        let raw = u64::from_le_bytes(raw_bytes);
        let pick = (raw as usize) % candidates.len();
        *arbiter_slot = candidates.swap_remove(pick);
    }

    Ok(arbiters)
}

fn derive_arbiter_seed(
    slot: u64,
    unix_timestamp: i64,
    bounty_key: &Pubkey,
    challenger: &Pubkey,
    respondent: &Pubkey,
    slot_idx: u8,
) -> [u8; 32] {
    let mut state: [u64; 4] = [
        0x9E37_79B9_7F4A_7C15 ^ slot ^ (unix_timestamp as u64).rotate_left(17),
        0xBF58_476D_1CE4_E5B9 ^ ((slot_idx as u64) << 56),
        0x94D0_49BB_1331_11EB,
        0xD6E8_FEB8_6659_FD93,
    ];

    let mut mix_bytes = |bytes: &[u8], lane: usize| {
        for (i, b) in bytes.iter().enumerate() {
            let idx = (lane + i) % 4;
            let mut x = state[idx].wrapping_add((*b as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15));
            x = (x ^ (x >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
            x = (x ^ (x >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
            state[idx] = x ^ (x >> 31);
        }
    };

    mix_bytes(b"kredowork-arbiter", 0);
    mix_bytes(bounty_key.as_ref(), 1);
    mix_bytes(challenger.as_ref(), 2);
    mix_bytes(respondent.as_ref(), 3);

    let mut out = [0u8; 32];
    for (i, word) in state.iter().enumerate() {
        out[i * 8..(i + 1) * 8].copy_from_slice(&word.to_le_bytes());
    }
    out
}
