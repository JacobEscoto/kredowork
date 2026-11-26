# AGENTS.md

## Project overview

KredoWork: an open-source protocol for coordinating, verifying, and settling technical micro-bounties on Solana (Devnet). Task criteria are frozen upfront via SHA-256 spec hashes, funds sit in isolated per-bounty vaults, and every non-terminal state has a timeout escape hatch (see README for the full pitch).

Repo layout:

```
kredowork/
├── programs/kredowork/   # Anchor on-chain program (state machine + LiteSVM tests)
└── apps/web/             # Next.js 16 + Tailwind v4 frontend (UI mockup, no on-chain wiring yet)
```

## Commands

- Build the Anchor program: `anchor build` (verified working; regenerates `target/deploy/kredowork.so` and `target/idl/kredowork.json`). Plain `cargo build` from `programs/kredowork` also works but does not emit the `.so`/IDL.
- Tests: `cargo test` (workspace; `Anchor.toml` wires `anchor test` to this). All 70 LiteSVM integration tests in `programs/kredowork/tests/` currently pass.
  - Integration tests need the program binary at `target/deploy/kredowork.so` or the `KREDOWORK_PROGRAM_SO` env var (see `tests/common/mod.rs`).
  - `anchor build` also runs the test suite as part of its build flow.
- Toolchain: Rust pinned to `1.89.0` (`rust-toolchain.toml`), `rust-version = 1.89.0` in `Cargo.toml`; Solana CLI `4.1.2` (`Anchor.toml` `[toolchain]`); anchor-cli `1.2.2` / `anchor-lang = "1.2.2"`.
- Frontend: `cd apps/web && pnpm install && pnpm dev` (also `pnpm build`, `pnpm start`). Node v24, pnpm 12.
- Off-chain services mentioned in the README (Azure indexer, delivery verifier, PostgreSQL/Blob) are **not in this repo yet** — only the program and the web app exist.

## Architecture notes

- Program ID: `Anchor.toml` and the docs use `ArDpfoTVD98T1NAoGG3XZw9NagP5sja63YzsfbSQ9QsB`, but `declare_id!` in `programs/kredowork/src/lib.rs` currently differs (`3RzuS3G4ed9akp7BLLckdQSFb6jQCckdvhNnkwwYFHcb`). Tests import `kredowork::ID`, so they follow `declare_id!`. Keep these in sync when deploying.
- Instructions: one file each in `programs/kredowork/src/instructions/<name>.rs` (handler + `#[derive(Accounts)]`), re-exported through `instructions.rs`, entrypoints declared in `src/lib.rs` under `#[program]`. 14 instructions: workspace init/update/pause, create/submit/approve/reject/finalize/cancel/reclaim bounty, and the dispute flow (challenge, defense, vote, resolve).
- Shared flow helpers live in `programs/kredowork/src/instructions/dispute.rs` (`require_*`, `calculate_bps_amount`, `calculate_bond_amount`, `checked_add/sub_amount`, `split_dispute_bond`, `select_dispute_arbiters`). Reuse them instead of duplicating checks — they are used by non-dispute instructions too (e.g. `require_not_paused`, `require_window_elapsed`).
- State (`src/state.rs`): 9-variant `BountyStatus` (Open → Claimed → Submitted → PreApproved → Rejected → Disputed → Completed, plus Cancelled/Expired), `DisputeStatus`, and accounts `WorkspaceConfig`, `BountyAccount`, `DisputeAccount`, `ReputationProfile`.
- PDA seeds (`src/constants.rs`): `workspace`, `bounty`, `vault`, `dispute`, `dispute_vault`, `reputation`. Max 8 reviewers (`MAX_REVIEWERS`), 3 arbiters from a pool of ≥9 (`ARBITERS_COUNT`, `MIN_ARBITER_POOL`).
- Review quorum is a bitmask: `BountyAccount.approvals_mask` + `approvals_count` vs `WorkspaceConfig.quorum_threshold`. `approvals_epoch`/`reviewers_epoch` reset the mask when the reviewer set changes; only `approve_work` writes the mask bit (`reject_work` deliberately does not).
- Time gates use `window_ends_at_ts` + `WorkspaceConfig.challenge_window_secs` / `review_timeout_secs` against `Clock.unix_timestamp`; `finalize_payout` is permissionless once the optimistic window expires.
- Frontend (`apps/web`): Next.js App Router pages under `app/` (bounties, workspaces, profile), components in `components/`, mock data in `lib/bounties.ts`. No Solana wallet adapter or RPC client is wired up yet — do not assume on-chain reads work.

## Gotchas

- Hand-written handlers that take `&mut` of accounts: use explicit lifetimes, e.g. `pub fn handler<'info>(ctx: Context<'info, ResolveDispute<'info>>, bounty_id: u64) -> Result<()>` — the elided `Context<X>` form triggers E0308 lifetime errors for some accounts structs.
- Anchor `require!` returns `()` and early-returns; helpers returning `Result` must end with `Ok(())` and are used with `?`.
- Arithmetic uses `checked_*` with `ok_or(BountyError::...)`; the handler return type is Anchor's `Result<T, Error>`, so use `?` for conversion.
- `UncheckedAccount` vaults are validated inside handlers via seeds — the type alone does not prove the PDA.

## Agent instructions

- Do not write or modify tests unless explicitly asked.
- Keep the README as the user-facing source of truth; when behavior changes, check whether README sections (state machine, key innovations) need a matching update.
