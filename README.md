# KredoWork

## Network notice
KredoWork operates **exclusively on Solana Devnet** using test SOL with no real monetary value. It is **not deployed on Mainnet** and no real funds are held or transferred.

## Project overview
Open-source maintenance and developer tooling often stalls on small, well-scoped tasks due to slow grant processes, centralized escrow control, and unverified reviews.

**KredoWork** turns micro-bounty settlement into a deterministic on-chain primitive:

- **Problem:** Existing platforms rely on admin master keys, allow unilateral scope changes or unfair rejections, and risk locking funds when parties go inactive.
- **Solution:** KredoWork freezes task criteria upfront via SHA-256 hashing, locks funds in isolated per-task vaults, verifies deliveries off-chain, and enforces time-bounded state transitions on-chain.

## Key innovations
1. **Zero master-key architecture & permissionless payouts:** Once a submission passes review and the optimistic window expires, any wallet can execute `finalize_payout`. Neither sponsors nor platform admins can stall approved funds.
2. **Symmetric two-sided reputation:** `ReputationProfile` tracks on-chain reliability for both contributors (completions, disputes won) and reviewers (overturn rate, review SLA compliance).
3. **Bonded dispute resolution:** Contested rejections or approvals escalate via economic bonds (`DisputeAccount`) resolved by a 3-arbitrator subcommittee (2-of-3 majority) with timeout defaults.
4. **Deterministic timeouts:** Every non-terminal state in the 9-state bounty machine includes a timeout escape hatch, preventing dead-end fund locks.

## Tech stack
- **On-chain program:** Anchor + Rust, deployed on Solana Devnet (`programs/kredowork/`).
- **Database & auth:** Supabase (PostgreSQL + GitHub OAuth).
- **Off-chain indexer:** Node.js / TypeScript Devnet event listener that syncs program events to Supabase (`indexer/`).
- **Frontend:** Next.js + Tailwind CSS (`apps/web/`) with Solana Wallet Adapter.

## Repository structure
```text
kredowork/
├── programs/
│   └── kredowork/          # Anchor on-chain program (Rust, state machine, LiteSVM tests)
├── apps/
│   └── web/                # Next.js + Tailwind CSS frontend
│       ├── app/            # App Router pages and route handlers
│       ├── components/     # UI components (brand, buttons, forms, pages)
│       ├── lib/
│       │   ├── anchor/     # Anchor IDL, PDA helpers, and Solana client
│       │   ├── supabase/   # Browser and admin Supabase clients
│       │   └── translations/ # i18n strings (English and Spanish)
│       └── public/
│           ├── icon.svg                # Color logo (navigation and UI)
│           └── icon-black-and-white.svg # Monochrome logo (footer only)
├── indexer/                # Node.js / TypeScript Devnet event listener (Supabase sync)
├── Anchor.toml
├── Cargo.toml
└── README.md
```

## Setup

### Prerequisites
- Rust & Cargo (pinned to 1.89.0 via `rust-toolchain.toml`)
- Solana CLI 4.1.2 (configured for Devnet)
- Anchor CLI 1.2.2
- Node.js v24 and pnpm 12

### 1. Clone and install dependencies
```bash
git clone https://github.com/JacobEscoto/kredowork.git kredowork
cd kredowork

# Anchor program
cd programs/kredowork
cargo build

# Frontend
cd ../../apps/web
pnpm install
```

### 2. Environment variables

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=<devnet program id>
NEXT_PUBLIC_SUPABASE_URL=<supabase project url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<supabase service role key>
```

- `NEXT_PUBLIC_SOLANA_NETWORK` — target network (devnet).
- `NEXT_PUBLIC_SOLANA_RPC_URL` — Devnet RPC endpoint.
- `NEXT_PUBLIC_PROGRAM_ID` — deployed KredoWork program ID on Devnet.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public Supabase client (browser).
- `SUPABASE_SERVICE_ROLE_KEY` — admin Supabase client (server only).

### 3. Run the applications

Frontend (Next.js dev server):
```bash
cd apps/web
pnpm dev        # http://localhost:3000
pnpm build      # production build
pnpm start      # production server
```

Anchor program tests (70 LiteSVM integration tests):
```bash
cd programs/kredowork
anchor build    # builds the program and runs the test suite
cargo test
```

Indexer:
```bash
cd indexer
pnpm install
pnpm dev        # Devnet event listener syncing to Supabase
```

### 4. Solana CLI (Devnet)
```bash
solana config set --url https://api.devnet.solana.com
solana address
solana airdrop 2
```
