use anchor_lang::prelude::*;

use crate::constants::*;
use crate::state::WorkspaceConfig;

pub fn handler(ctx: Context<SetPaused>, is_paused: bool) -> Result<()> {
    let workspace = &mut ctx.accounts.workspace;
    workspace.is_paused = is_paused;
    Ok(())
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(
        mut,
        has_one = authority,
        seeds = [
            WORKSPACE_SEED,
            workspace.authority.as_ref(),
            &workspace.workspace_id.to_le_bytes()
        ],
        bump = workspace.bump
    )]
    pub workspace: Account<'info, WorkspaceConfig>,

    pub authority: Signer<'info>,
}
