pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

use errors::BountyError;
use instructions::*;

declare_id!("ArDpfoTVD98T1NAoGG3XZw9NagP5sja63YzsfbSQ9QsB");

#[program]
pub mod kredowork {
    use super::*;

    pub fn initialize_workspace(
        ctx: Context<InitializeWorkspace>,
        params: WorkspaceParams,
    ) -> Result<()> {
        instructions::initialize_workspace::handler(ctx, params)
    }

    pub fn create_bounty(
        ctx: Context<CreateBounty>,
        reward_amount: u64,
        spec_hash: [u8; 32],
        deadline_ts: i64,
    ) -> Result<()> {
        instructions::create_bounty::handler(ctx, reward_amount, spec_hash, deadline_ts)
    }

    pub fn submit_work(
        ctx: Context<SubmitWork>,
        bounty_id: u64,
        delivery_hash: [u8; 32],
    ) -> Result<()> {
        instructions::submit_work::handler(ctx, bounty_id, delivery_hash)
    }

    pub fn approve_work(ctx: Context<ApproveWork>, bounty_id: u64) -> Result<()> {
        instructions::approve_work::handler(ctx, bounty_id)
    }

    pub fn reject_work(ctx: Context<RejectWork>, bounty_id: u64) -> Result<()> {
        instructions::reject_work::handler(ctx, bounty_id)
    }

    pub fn finalize_payout(ctx: Context<FinalizePayout>, bounty_id: u64) -> Result<()> {
        instructions::finalize_payout::handler(ctx, bounty_id)
    }

    pub fn cancel_bounty(ctx: Context<CancelBounty>, bounty_id: u64) -> Result<()> {
        instructions::cancel_bounty::handler(ctx, bounty_id)
    }

    pub fn reclaim_expired(ctx: Context<ReclaimExpired>, bounty_id: u64) -> Result<()> {
        instructions::reclaim_expired::handler(ctx, bounty_id)
    }

    pub fn set_paused(ctx: Context<SetPaused>, is_paused: bool) -> Result<()> {
        instructions::set_paused::handler(ctx, is_paused)
    }

    pub fn update_workspace(
        ctx: Context<UpdateWorkspace>,
        params: UpdateWorkspaceParams,
    ) -> Result<()> {
        instructions::update_workspace::handler(ctx, params)
    }
}
