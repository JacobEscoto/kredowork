import {
  address,
  getAddressEncoder,
  getProgramDerivedAddress,
  getU64Encoder,
  type Address,
  type ProgramDerivedAddress,
} from "@solana/kit";
import idl from "./kredowork.json";

export const KREDOWORK_PROGRAM_ID = address(idl.address);

/**
 * PDA seed constants aligned with `programs/kredowork/src/constants.rs`.
 */
export const SEEDS = {
  WORKSPACE: "workspace",
  BOUNTY: "bounty",
  VAULT: "vault",
  DISPUTE: "dispute",
  REPUTATION: "reputation",
  DISPUTE_VAULT: "dispute_vault",
} as const;

export const PROTOCOL_LIMITS = {
  MAX_REVIEWERS: 8,
  ARBITERS_COUNT: 3,
  MIN_ARBITER_POOL: 9,
} as const;

const textEncoder = new TextEncoder();
const addressEncoder = getAddressEncoder();
const u64Encoder = getU64Encoder();

function encodeSeedString(seed: string): Uint8Array {
  return textEncoder.encode(seed);
}

function encodeU64Seed(value: bigint | number): Uint8Array {
  return new Uint8Array(u64Encoder.encode(BigInt(value)));
}

function encodeAddressSeed(addr: Address): Uint8Array {
  return new Uint8Array(addressEncoder.encode(addr));
}

/**
 * Derives `WorkspaceConfig` PDA: `[b"workspace", authority, workspace_id.to_le_bytes()]`.
 */
export async function deriveWorkspacePda(
  authority: Address,
  workspaceId: bigint | number,
  programId: Address = KREDOWORK_PROGRAM_ID,
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      encodeSeedString(SEEDS.WORKSPACE),
      encodeAddressSeed(authority),
      encodeU64Seed(workspaceId),
    ],
  });
}

/**
 * Derives `BountyAccount` PDA: `[b"bounty", workspace, bounty_id.to_le_bytes()]`.
 */
export async function deriveBountyPda(
  workspace: Address,
  bountyId: bigint | number,
  programId: Address = KREDOWORK_PROGRAM_ID,
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      encodeSeedString(SEEDS.BOUNTY),
      encodeAddressSeed(workspace),
      encodeU64Seed(bountyId),
    ],
  });
}

/**
 * Derives the bounty escrow vault PDA: `[b"vault", bounty]`.
 */
export async function deriveEscrowVaultPda(
  bounty: Address,
  programId: Address = KREDOWORK_PROGRAM_ID,
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    programAddress: programId,
    seeds: [encodeSeedString(SEEDS.VAULT), encodeAddressSeed(bounty)],
  });
}

/**
 * Derives `DisputeAccount` PDA: `[b"dispute", bounty]`.
 */
export async function deriveDisputePda(
  bounty: Address,
  programId: Address = KREDOWORK_PROGRAM_ID,
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    programAddress: programId,
    seeds: [encodeSeedString(SEEDS.DISPUTE), encodeAddressSeed(bounty)],
  });
}

/**
 * Derives the dispute bond vault PDA: `[b"dispute_vault", dispute]`.
 */
export async function deriveDisputeVaultPda(
  dispute: Address,
  programId: Address = KREDOWORK_PROGRAM_ID,
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    programAddress: programId,
    seeds: [encodeSeedString(SEEDS.DISPUTE_VAULT), encodeAddressSeed(dispute)],
  });
}

/**
 * Derives `ReputationProfile` PDA: `[b"reputation", owner]`.
 */
export async function deriveReputationProfilePda(
  owner: Address,
  programId: Address = KREDOWORK_PROGRAM_ID,
): Promise<ProgramDerivedAddress> {
  return getProgramDerivedAddress({
    programAddress: programId,
    seeds: [encodeSeedString(SEEDS.REPUTATION), encodeAddressSeed(owner)],
  });
}
