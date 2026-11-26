# KredoWork
An open-source protocol for coordinating, verifying, and settling technical micro-bounties on Solana without centralized admin keys or manual payout bottlenecks.

## Project Overview
Open-source maintenance and developer tooling often stall on small, well-scoped tasks due to slow grant processes, centralized escrow control, and unverified reviews.

**KredoWork** turns micro-bounty settlement into a deterministic on-chain primitive:
- **Problem:** Existing platforms rely on admin master keys, allow unilateral scope changes or unfair rejections, and risk locking funds when parties go inactive.
- **Soluton:** KredoWork freezes task criteria upfront via SHA-256 hashing, locks funds in isolated per-task vaults (`EscroVault`), verifies deliveries off-chain, and enforces time-bounded strate transitions on-chain.

## Key Innovations
1. **Zero Master-Key & Permissionless Payouts:** Once a submission passes review and the optimistic window expires, any wallet can execute `finalize_payout`, neither sponsors nor platform admins can stall approved funds.
2. **Symmetric Two-Sided Reputation:** Tracks on-chain reliability for both contributors (completions, disputes won) and reviewers (overturn rate, review SLA compliance).
3. **Bonded Dispute Resolution:** Contested rejections or approvals escalate via economic bonds (`DisputeAccount`) resolved by a 3-arbitrator subcommittee (2-of-3 majority) with timeout defaults.
4. **Zero Fund-Locking Guarantee:** Every non-terminal state in the 9-state machine includes deterministic timeout escape hatches.

## Tech Stack
1. **On-Chain Program:** Anchor + Rust (Solana Devnet)
2. **Off-Chain Services & Indexer:** Microsoft Azure (event indexer, delivery verifier, signed attestations, PostgreSQL / Azure Blob Storage)
3. **Frontend:** Next.js + Tailwind CSS (Solana Wallet Adapter on Devnet)

## Project Structure
```bash
kredowork/
├── programs/               # Anchor on-chain program
└── apps/
     └── web/               # Next.js + Tailwind CSS frontend
```

## Installation & Setup

### Prerequisites
- Rust & Cargo (stable)
- Solana CLI (configured for `devnet`)
- Anchor CLI
- Node.js (v20+) & `pnpm`

### 1. Clone and Install
```bash
git clone https://github.com/JacobEscoto/kredowork.git kredowork
cd kredowork/apps/web
pnpm install
```

### 2. Configure Solana CLI for Devnet
```bash
solana config set --url https://api.devnet.solana.com
solana address
solana airdrop 2
```
