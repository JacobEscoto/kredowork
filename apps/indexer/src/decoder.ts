import {
  BorshAccountsCoder,
  BorshInstructionCoder,
  type Idl,
} from "@coral-xyz/anchor";
import {
  getAddressEncoder,
  getBase58Encoder,
  getBase64Encoder,
  getProgramDerivedAddress,
  getUtf8Encoder,
  type Address,
} from "@solana/kit";
import rawIdl from "./idl/kredowork.json" with { type: "json" };

export const idl = rawIdl as unknown as Idl;
export const instructionCoder = new BorshInstructionCoder(idl);
export const accountsCoder = new BorshAccountsCoder(idl);

const utf8Encoder = getUtf8Encoder();
const addressEncoder = getAddressEncoder();
const base58Encoder = getBase58Encoder();
const base64Encoder = getBase64Encoder();

export function bytesToHex(bytes: number[] | Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

export async function deriveVaultPda(
  bountyPda: Address,
  programId: Address,
): Promise<Address> {
  const [vault] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [utf8Encoder.encode("vault"), addressEncoder.encode(bountyPda)],
  });
  return vault;
}

export function decodeBase58Instruction(base58Data: string) {
  try {
    const raw = Buffer.from(base58Encoder.encode(base58Data));
    return instructionCoder.decode(raw);
  } catch {
    return null;
  }
}

export function decodeBase64Account(
  base64Data: string,
):
  | { kind: "WorkspaceConfig"; decoded: any }
  | { kind: "BountyAccount"; decoded: any }
  | { kind: "DisputeAccount"; decoded: any }
  | { kind: "ReputationProfile"; decoded: any }
  | null {
  const raw = Buffer.from(base64Encoder.encode(base64Data));
  if (raw.length <= 8) return null;

  const accountNames = [
    "WorkspaceConfig",
    "BountyAccount",
    "DisputeAccount",
    "ReputationProfile",
  ] as const;

  for (const name of accountNames) {
    try {
      const decoded = accountsCoder.decode(name, raw);
      return { kind: name, decoded };
    } catch {
      // Discriminator mismatch
    }
  }
  return null;
}

export function mapBountyStatus(statusObj: Record<string, unknown>): string {
  const key = (Object.keys(statusObj)[0] ?? "Open").toLowerCase();
  const map: Record<string, string> = {
    open: "OPEN",
    claimed: "CLAIMED",
    submitted: "SUBMITTED",
    preapproved: "PRE_APPROVED",
    rejected: "REJECTED",
    disputed: "DISPUTED",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
    expired: "EXPIRED",
  };
  return map[key] ?? "OPEN";
}

export function mapDisputeResolution(
  statusObj: Record<string, unknown>,
): string {
  const key = (Object.keys(statusObj)[0] ?? "Open").toLowerCase();
  const map: Record<string, string> = {
    open: "PENDING",
    resolvedforchallenger: "CHALLENGER_WON",
    resolvedforrespondent: "RESPONDENT_WON",
  };
  return map[key] ?? "PENDING";
}
