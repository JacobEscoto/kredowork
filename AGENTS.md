# AGENTS.md

## Commands

- Anchor program lives in `programs/kredowork` (program ID `ArDpfoTVD98T1NAoGG3XZw9NagP5sja63YzsfbSQ9QsB`); Next.js app in `apps/web`.
- Build the Anchor program (verified working):
  - From `programs/kredowork`: `cargo build`
  - or with the BPF toolchain: `cargo +1.89.0-sbpf-solana-v1.54 build`
- `anchor build` currently fails in this environment due to a broken Solana CLI install (`agave-install` cannot load config / unknown release). Treat that as environmental, not a code error; use the cargo commands above.
- Rust toolchain: pinned to `1.89.0` (`rust-toolchain.toml`), with BPF toolchain `1.89.0-sbpf-solana-v1.54` installed.
- Tests: `cargo test` (workspace). LiteSVM integration tests in `programs/kredowork/tests/` require the program .so at `target/deploy/kredowork.so` or the `KREDOWORK_PROGRAM_SO` env var.

## Architecture notes

- Program instructions: `programs/kredowork/src/instructions/<name>.rs` (handler + `#[derive(Accounts)]` struct); entrypoints in `programs/kredowork/src/lib.rs` under `#[program]`.
- Shared dispute-flow helpers: `programs/kredowork/src/instructions/dispute.rs` (validations, bps math, bond split, arbiter selection). Dispute instructions should reuse these instead of duplicating checks.

## Gotchas

- Hand-written handlers that take `&mut` of accounts: use explicit lifetimes, e.g. `pub fn handler<'info>(ctx: Context<'info, ResolveDispute<'info>>, bounty_id: u64) -> Result<()>` — the elided `Context<X>` form triggers E0308 lifetime errors for some accounts structs.
- Anchor `require!` returns `()` and early-returns; helpers returning `Result` must end with `Ok(())` and are used with `?`.
- Arithmetic uses `checked_*` with `ok_or(BountyError::...)`; the handler return type is Anchor's `Result<T, Error>`, so use `?` for conversion.

## Agent instructions

- Do not write or modify tests unless explicitly asked.
