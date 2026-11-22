use anchor_lang::prelude::*;

#[constant]
pub const WORKSPACE_SEED: &[u8] = b"workspace";

#[constant]
pub const BOUNTY_SEED: &[u8] = b"bounty";

#[constant]
pub const VAULT_SEED: &[u8] = b"vault";

#[constant]
pub const DISPUTE_SEED: &[u8] = b"dispute";

#[constant]
pub const REPUTATION_SEED: &[u8] = b"reputation";

pub const MAX_REVIEWERS: usize = 8;
pub const ARBITERS_COUNT: usize = 3;
