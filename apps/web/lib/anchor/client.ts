import {
  AccountRole,
  address,
  createSolanaRpc,
  fetchEncodedAccount,
  fixDecoderSize,
  fixEncoderSize,
  getAddressDecoder,
  getAddressEncoder,
  getArrayDecoder,
  getArrayEncoder,
  getBooleanDecoder,
  getBooleanEncoder,
  getBytesDecoder,
  getBytesEncoder,
  getI64Decoder,
  getI64Encoder,
  getOptionDecoder,
  getOptionEncoder,
  getStructDecoder,
  getStructEncoder,
  getU16Decoder,
  getU16Encoder,
  getU64Decoder,
  getU64Encoder,
  getU8Decoder,
  getU8Encoder,
  none,
  some,
  type AccountMeta,
  type Address,
  type Instruction,
  type Option,
  type ReadonlyUint8Array,
} from "@solana/kit";
import idl from "./kredowork.json";
import type { Kredowork } from "./kredowork";
import {
  deriveBountyPda,
  deriveDisputePda,
  deriveDisputeVaultPda,
  deriveEscrowVaultPda,
  deriveReputationProfilePda,
  deriveWorkspacePda,
  KREDOWORK_PROGRAM_ID,
} from "./pdas";

export type { Kredowork };
export * from "./pdas";
export * from "./hash";

export const DEVNET_RPC_URL = "https://api.devnet.solana.com";
export const SYSTEM_PROGRAM_ID = address("11111111111111111111111111111111");

export type KredoworkRpc = ReturnType<typeof createSolanaRpc>;

export function createKredoworkRpc(
  rpcUrl: string = DEVNET_RPC_URL,
): KredoworkRpc {
  return createSolanaRpc(rpcUrl);
}

// ── State types aligned with `programs/kredowork/src/state.rs` ──────────────

export const BOUNTY_STATUS_VALUES = [
  "Open",
  "Claimed",
  "Submitted",
  "PreApproved",
  "Rejected",
  "Disputed",
  "Completed",
  "Cancelled",
  "Expired",
] as const;

export type BountyStatus = (typeof BOUNTY_STATUS_VALUES)[number];

export const DISPUTE_STATUS_VALUES = [
  "Open",
  "ResolvedForChallenger",
  "ResolvedForRespondent",
] as const;

export type DisputeStatus = (typeof DISPUTE_STATUS_VALUES)[number];

export const DISPUTE_VOTE_SIDES = ["Challenger", "Respondent"] as const;
export type DisputeVoteSide = (typeof DISPUTE_VOTE_SIDES)[number];

export interface WorkspaceConfig {
  authority: Address;
  workspaceId: bigint;
  bountyCount: bigint;
  quorumThreshold: number;
  maxSubmissionAttempts: number;
  challengeWindowSecs: bigint;
  reviewTimeoutSecs: bigint;
  feeBps: number;
  bondBps: number;
  reviewersEpoch: number;
  reviewers: Address[];
  isPaused: boolean;
  bump: number;
}

export interface BountyAccount {
  workspace: Address;
  sponsor: Address;
  claimant: Address | null;
  rejectedClaimant: Address | null;
  rejectedBy: Address | null;
  bountyId: bigint;
  rewardAmount: bigint;
  lockedBond: bigint;
  specHash: Uint8Array;
  deliveryHash: Uint8Array | null;
  status: BountyStatus;
  deadlineTs: bigint;
  submittedAtTs: bigint | null;
  windowEndsAtTs: bigint | null;
  approvalsCount: number;
  approvalsMask: number;
  approvalsEpoch: number;
  submissionAttempts: number;
  bump: number;
  vaultBump: number;
}

export interface DisputeAccount {
  bounty: Address;
  challenger: Address;
  respondent: Address;
  challengeBond: bigint;
  defenseBond: bigint;
  challengeEvidenceHash: Uint8Array;
  defenseEvidenceHash: Uint8Array | null;
  arbiters: Address[];
  votesForChallenger: number;
  votesForRespondent: number;
  votesMask: number;
  status: DisputeStatus;
  deadlineTs: bigint;
  bump: number;
}

export interface ReputationProfile {
  owner: Address;
  bountiesCompleted: bigint;
  bountiesRejected: bigint;
  totalEarned: bigint;
  disputesWon: bigint;
  disputesLost: bigint;
  overturnedReviews: bigint;
  reputationScore: bigint;
  bump: number;
}

export interface WorkspaceParams {
  workspaceId: bigint | number;
  quorumThreshold: number;
  maxSubmissionAttempts: number;
  challengeWindowSecs: bigint | number;
  reviewTimeoutSecs: bigint | number;
  feeBps: number;
  bondBps: number;
  reviewers: Address[];
}

export interface UpdateWorkspaceParams {
  challengeWindowSecs?: bigint | number | null;
  reviewTimeoutSecs?: bigint | number | null;
  reviewers?: Address[] | null;
}

// ── Account Borsh Decoders ───────────────────────────────────────────────────

const bytes32Decoder = fixDecoderSize(getBytesDecoder(), 32);
const bytes32Encoder = fixEncoderSize(getBytesEncoder(), 32);

function unwrapOption<T>(opt: Option<T>): T | null {
  return opt.__option === "Some" ? opt.value : null;
}

function wrapOption<T>(value: T | null | undefined): Option<T> {
  return value === null || value === undefined ? none<T>() : some(value);
}

const rawWorkspaceDecoder = getStructDecoder([
  ["authority", getAddressDecoder()],
  ["workspaceId", getU64Decoder()],
  ["bountyCount", getU64Decoder()],
  ["quorumThreshold", getU8Decoder()],
  ["maxSubmissionAttempts", getU8Decoder()],
  ["challengeWindowSecs", getI64Decoder()],
  ["reviewTimeoutSecs", getI64Decoder()],
  ["feeBps", getU16Decoder()],
  ["bondBps", getU16Decoder()],
  ["reviewersEpoch", getU16Decoder()],
  ["reviewers", getArrayDecoder(getAddressDecoder())],
  ["isPaused", getBooleanDecoder()],
  ["bump", getU8Decoder()],
]);

const rawBountyDecoder = getStructDecoder([
  ["workspace", getAddressDecoder()],
  ["sponsor", getAddressDecoder()],
  ["claimant", getOptionDecoder(getAddressDecoder())],
  ["rejectedClaimant", getOptionDecoder(getAddressDecoder())],
  ["rejectedBy", getOptionDecoder(getAddressDecoder())],
  ["bountyId", getU64Decoder()],
  ["rewardAmount", getU64Decoder()],
  ["lockedBond", getU64Decoder()],
  ["specHash", bytes32Decoder],
  ["deliveryHash", getOptionDecoder(bytes32Decoder)],
  ["status", getU8Decoder()],
  ["deadlineTs", getI64Decoder()],
  ["submittedAtTs", getOptionDecoder(getI64Decoder())],
  ["windowEndsAtTs", getOptionDecoder(getI64Decoder())],
  ["approvalsCount", getU8Decoder()],
  ["approvalsMask", getU8Decoder()],
  ["approvalsEpoch", getU16Decoder()],
  ["submissionAttempts", getU8Decoder()],
  ["bump", getU8Decoder()],
  ["vaultBump", getU8Decoder()],
]);

const rawDisputeDecoder = getStructDecoder([
  ["bounty", getAddressDecoder()],
  ["challenger", getAddressDecoder()],
  ["respondent", getAddressDecoder()],
  ["challengeBond", getU64Decoder()],
  ["defenseBond", getU64Decoder()],
  ["challengeEvidenceHash", bytes32Decoder],
  ["defenseEvidenceHash", getOptionDecoder(bytes32Decoder)],
  ["arbiters", getArrayDecoder(getAddressDecoder(), { size: 3 })],
  ["votesForChallenger", getU8Decoder()],
  ["votesForRespondent", getU8Decoder()],
  ["votesMask", getU8Decoder()],
  ["status", getU8Decoder()],
  ["deadlineTs", getI64Decoder()],
  ["bump", getU8Decoder()],
]);

const rawReputationDecoder = getStructDecoder([
  ["owner", getAddressDecoder()],
  ["bountiesCompleted", getU64Decoder()],
  ["bountiesRejected", getU64Decoder()],
  ["totalEarned", getU64Decoder()],
  ["disputesWon", getU64Decoder()],
  ["disputesLost", getU64Decoder()],
  ["overturnedReviews", getU64Decoder()],
  ["reputationScore", getI64Decoder()],
  ["bump", getU8Decoder()],
]);

function getAccountDiscriminator(accountName: string): Uint8Array {
  const entry = idl.accounts.find((a) => a.name === accountName);
  if (!entry) {
    throw new Error(`Account "${accountName}" not found in IDL.`);
  }
  return new Uint8Array(entry.discriminator);
}

function getInstructionDiscriminator(ixName: string): Uint8Array {
  const entry = idl.instructions.find((i) => i.name === ixName);
  if (!entry) {
    throw new Error(`Instruction "${ixName}" not found in IDL.`);
  }
  return new Uint8Array(entry.discriminator);
}

function assertAccountDiscriminator(
  data: ReadonlyUint8Array,
  accountName: string,
): Uint8Array {
  const expected = getAccountDiscriminator(accountName);
  if (data.length < 8) {
    throw new Error(`${accountName} account data is shorter than 8 bytes.`);
  }
  for (let i = 0; i < 8; i++) {
    if (data[i] !== expected[i]) {
      throw new Error(`Invalid discriminator for ${accountName} account.`);
    }
  }
  return new Uint8Array(data.slice(8));
}

export function decodeWorkspaceConfig(
  data: ReadonlyUint8Array,
): WorkspaceConfig {
  const payload = assertAccountDiscriminator(data, "WorkspaceConfig");
  return rawWorkspaceDecoder.decode(payload);
}

export function decodeBountyAccount(data: ReadonlyUint8Array): BountyAccount {
  const payload = assertAccountDiscriminator(data, "BountyAccount");
  const raw = rawBountyDecoder.decode(payload);
  return {
    workspace: raw.workspace,
    sponsor: raw.sponsor,
    claimant: unwrapOption(raw.claimant),
    rejectedClaimant: unwrapOption(raw.rejectedClaimant),
    rejectedBy: unwrapOption(raw.rejectedBy),
    bountyId: raw.bountyId,
    rewardAmount: raw.rewardAmount,
    lockedBond: raw.lockedBond,
    specHash: new Uint8Array(raw.specHash),
    deliveryHash: raw.deliveryHash.__option === "Some"
      ? new Uint8Array(raw.deliveryHash.value)
      : null,
    status: BOUNTY_STATUS_VALUES[raw.status] ?? "Open",
    deadlineTs: raw.deadlineTs,
    submittedAtTs: unwrapOption(raw.submittedAtTs),
    windowEndsAtTs: unwrapOption(raw.windowEndsAtTs),
    approvalsCount: raw.approvalsCount,
    approvalsMask: raw.approvalsMask,
    approvalsEpoch: raw.approvalsEpoch,
    submissionAttempts: raw.submissionAttempts,
    bump: raw.bump,
    vaultBump: raw.vaultBump,
  };
}

export function decodeDisputeAccount(data: ReadonlyUint8Array): DisputeAccount {
  const payload = assertAccountDiscriminator(data, "DisputeAccount");
  const raw = rawDisputeDecoder.decode(payload);
  return {
    bounty: raw.bounty,
    challenger: raw.challenger,
    respondent: raw.respondent,
    challengeBond: raw.challengeBond,
    defenseBond: raw.defenseBond,
    challengeEvidenceHash: new Uint8Array(raw.challengeEvidenceHash),
    defenseEvidenceHash: raw.defenseEvidenceHash.__option === "Some"
      ? new Uint8Array(raw.defenseEvidenceHash.value)
      : null,
    arbiters: raw.arbiters,
    votesForChallenger: raw.votesForChallenger,
    votesForRespondent: raw.votesForRespondent,
    votesMask: raw.votesMask,
    status: DISPUTE_STATUS_VALUES[raw.status] ?? "Open",
    deadlineTs: raw.deadlineTs,
    bump: raw.bump,
  };
}

export function decodeReputationProfile(
  data: ReadonlyUint8Array,
): ReputationProfile {
  const payload = assertAccountDiscriminator(data, "ReputationProfile");
  return rawReputationDecoder.decode(payload);
}

// ── Instruction Data Encoders ────────────────────────────────────────────────

function buildInstructionData(
  ixName: string,
  encodedArgs: ReadonlyUint8Array = new Uint8Array(0),
): Uint8Array {
  const disc = getInstructionDiscriminator(ixName);
  const out = new Uint8Array(8 + encodedArgs.length);
  out.set(disc, 0);
  out.set(encodedArgs, 8);
  return out;
}

function assertBytes32(bytes: Uint8Array, label: string): Uint8Array {
  if (bytes.length !== 32) {
    throw new Error(`${label} must be exactly 32 bytes (got ${bytes.length}).`);
  }
  return bytes;
}

const u64ArgEncoder = getU64Encoder();
const boolArgEncoder = getBooleanEncoder();

const workspaceParamsEncoder = getStructEncoder([
  ["workspaceId", getU64Encoder()],
  ["quorumThreshold", getU8Encoder()],
  ["maxSubmissionAttempts", getU8Encoder()],
  ["challengeWindowSecs", getI64Encoder()],
  ["reviewTimeoutSecs", getI64Encoder()],
  ["feeBps", getU16Encoder()],
  ["bondBps", getU16Encoder()],
  ["reviewers", getArrayEncoder(getAddressEncoder())],
]);

const updateWorkspaceParamsEncoder = getStructEncoder([
  ["challengeWindowSecs", getOptionEncoder(getI64Encoder())],
  ["reviewTimeoutSecs", getOptionEncoder(getI64Encoder())],
  ["reviewers", getOptionEncoder(getArrayEncoder(getAddressEncoder()))],
]);

const createBountyArgsEncoder = getStructEncoder([
  ["rewardAmount", getU64Encoder()],
  ["specHash", bytes32Encoder],
  ["deadlineTs", getI64Encoder()],
]);

const bountyHashArgsEncoder = getStructEncoder([
  ["bountyId", getU64Encoder()],
  ["hash", bytes32Encoder],
]);

const voteDisputeArgsEncoder = getStructEncoder([
  ["bountyId", getU64Encoder()],
  ["side", getU8Encoder()],
]);

// ── Error Parsing ────────────────────────────────────────────────────────────

export interface KredoworkProgramError {
  code: number;
  name: string;
  msg: string;
}

export function getKredoworkErrorByCode(
  code: number,
): KredoworkProgramError | null {
  return idl.errors.find((e) => e.code === code) ?? null;
}

// ── Typed Anchor Client ──────────────────────────────────────────────────────

export class KredoworkClient {
  readonly rpc: KredoworkRpc;
  readonly programId: Address;

  constructor(
    rpc: KredoworkRpc = createKredoworkRpc(),
    programId: Address = KREDOWORK_PROGRAM_ID,
  ) {
    this.rpc = rpc;
    this.programId = programId;
  }

  // ── Account Fetchers ───────────────────────────────────────────────────────

  async fetchWorkspace(address: Address): Promise<WorkspaceConfig | null> {
    const account = await fetchEncodedAccount(this.rpc, address);
    return account.exists ? decodeWorkspaceConfig(account.data) : null;
  }

  async fetchWorkspaceById(
    authority: Address,
    workspaceId: bigint | number,
  ): Promise<{ address: Address; data: WorkspaceConfig } | null> {
    const [pda] = await deriveWorkspacePda(
      authority,
      workspaceId,
      this.programId,
    );
    const data = await this.fetchWorkspace(pda);
    return data ? { address: pda, data } : null;
  }

  async fetchBounty(address: Address): Promise<BountyAccount | null> {
    const account = await fetchEncodedAccount(this.rpc, address);
    return account.exists ? decodeBountyAccount(account.data) : null;
  }

  async fetchBountyById(
    workspace: Address,
    bountyId: bigint | number,
  ): Promise<{ address: Address; data: BountyAccount } | null> {
    const [pda] = await deriveBountyPda(workspace, bountyId, this.programId);
    const data = await this.fetchBounty(pda);
    return data ? { address: pda, data } : null;
  }

  async fetchDispute(address: Address): Promise<DisputeAccount | null> {
    const account = await fetchEncodedAccount(this.rpc, address);
    return account.exists ? decodeDisputeAccount(account.data) : null;
  }

  async fetchDisputeByBounty(
    bounty: Address,
  ): Promise<{ address: Address; data: DisputeAccount } | null> {
    const [pda] = await deriveDisputePda(bounty, this.programId);
    const data = await this.fetchDispute(pda);
    return data ? { address: pda, data } : null;
  }

  async fetchReputationProfile(
    address: Address,
  ): Promise<ReputationProfile | null> {
    const account = await fetchEncodedAccount(this.rpc, address);
    return account.exists ? decodeReputationProfile(account.data) : null;
  }

  async fetchReputationProfileByOwner(
    owner: Address,
  ): Promise<{ address: Address; data: ReputationProfile } | null> {
    const [pda] = await deriveReputationProfilePda(owner, this.programId);
    const data = await this.fetchReputationProfile(pda);
    return data ? { address: pda, data } : null;
  }

  // ── Instruction Builders ───────────────────────────────────────────────────

  async buildInitializeWorkspaceIx(
    authority: Address,
    params: WorkspaceParams,
  ): Promise<{ instruction: Instruction; workspace: Address }> {
    const [workspace] = await deriveWorkspacePda(
      authority,
      params.workspaceId,
      this.programId,
    );
    const data = buildInstructionData(
      "initialize_workspace",
      workspaceParamsEncoder.encode({
        workspaceId: BigInt(params.workspaceId),
        quorumThreshold: params.quorumThreshold,
        maxSubmissionAttempts: params.maxSubmissionAttempts,
        challengeWindowSecs: BigInt(params.challengeWindowSecs),
        reviewTimeoutSecs: BigInt(params.reviewTimeoutSecs),
        feeBps: params.feeBps,
        bondBps: params.bondBps,
        reviewers: params.reviewers,
      }),
    );
    return {
      workspace,
      instruction: {
        programAddress: this.programId,
        accounts: [
          { address: workspace, role: AccountRole.WRITABLE },
          { address: authority, role: AccountRole.WRITABLE_SIGNER },
          { address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
        ],
        data,
      },
    };
  }

  buildUpdateWorkspaceIx(
    authority: Address,
    workspace: Address,
    params: UpdateWorkspaceParams,
  ): Instruction {
    const data = buildInstructionData(
      "update_workspace",
      updateWorkspaceParamsEncoder.encode({
        challengeWindowSecs: wrapOption(
          params.challengeWindowSecs === undefined ||
            params.challengeWindowSecs === null
            ? null
            : BigInt(params.challengeWindowSecs),
        ),
        reviewTimeoutSecs: wrapOption(
          params.reviewTimeoutSecs === undefined ||
            params.reviewTimeoutSecs === null
            ? null
            : BigInt(params.reviewTimeoutSecs),
        ),
        reviewers: wrapOption(params.reviewers ?? null),
      }),
    );
    return {
      programAddress: this.programId,
      accounts: [
        { address: workspace, role: AccountRole.WRITABLE },
        { address: authority, role: AccountRole.READONLY_SIGNER },
      ],
      data,
    };
  }

  buildSetPausedIx(
    authority: Address,
    workspace: Address,
    isPaused: boolean,
  ): Instruction {
    return {
      programAddress: this.programId,
      accounts: [
        { address: workspace, role: AccountRole.WRITABLE },
        { address: authority, role: AccountRole.READONLY_SIGNER },
      ],
      data: buildInstructionData("set_paused", boolArgEncoder.encode(isPaused)),
    };
  }

  async buildInitializeReputationIx(
    owner: Address,
  ): Promise<{ instruction: Instruction; profile: Address }> {
    const [profile] = await deriveReputationProfilePda(owner, this.programId);
    return {
      profile,
      instruction: {
        programAddress: this.programId,
        accounts: [
          { address: profile, role: AccountRole.WRITABLE },
          { address: owner, role: AccountRole.WRITABLE_SIGNER },
          { address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
        ],
        data: buildInstructionData("initialize_reputation"),
      },
    };
  }

  async buildCreateBountyIx(args: {
    sponsor: Address;
    workspace: Address;
    bountyId: bigint | number;
    rewardAmount: bigint | number;
    specHash: Uint8Array;
    deadlineTs: bigint | number;
  }): Promise<{ instruction: Instruction; bounty: Address; vault: Address }> {
    const [bounty] = await deriveBountyPda(
      args.workspace,
      args.bountyId,
      this.programId,
    );
    const [vault] = await deriveEscrowVaultPda(bounty, this.programId);
    const data = buildInstructionData(
      "create_bounty",
      createBountyArgsEncoder.encode({
        rewardAmount: BigInt(args.rewardAmount),
        specHash: assertBytes32(args.specHash, "specHash"),
        deadlineTs: BigInt(args.deadlineTs),
      }),
    );
    return {
      bounty,
      vault,
      instruction: {
        programAddress: this.programId,
        accounts: [
          { address: args.workspace, role: AccountRole.WRITABLE },
          { address: bounty, role: AccountRole.WRITABLE },
          { address: vault, role: AccountRole.WRITABLE },
          { address: args.sponsor, role: AccountRole.WRITABLE_SIGNER },
          { address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
        ],
        data,
      },
    };
  }

  async buildSubmitWorkIx(args: {
    contributor: Address;
    workspace: Address;
    bountyId: bigint | number;
    deliveryHash: Uint8Array;
  }): Promise<Instruction> {
    const [bounty] = await deriveBountyPda(
      args.workspace,
      args.bountyId,
      this.programId,
    );
    return {
      programAddress: this.programId,
      accounts: [
        { address: args.workspace, role: AccountRole.READONLY },
        { address: bounty, role: AccountRole.WRITABLE },
        { address: args.contributor, role: AccountRole.READONLY_SIGNER },
      ],
      data: buildInstructionData(
        "submit_work",
        bountyHashArgsEncoder.encode({
          bountyId: BigInt(args.bountyId),
          hash: assertBytes32(args.deliveryHash, "deliveryHash"),
        }),
      ),
    };
  }

  async buildApproveWorkIx(args: {
    reviewer: Address;
    workspace: Address;
    bountyId: bigint | number;
  }): Promise<Instruction> {
    const [bounty] = await deriveBountyPda(
      args.workspace,
      args.bountyId,
      this.programId,
    );
    return {
      programAddress: this.programId,
      accounts: [
        { address: args.workspace, role: AccountRole.READONLY },
        { address: bounty, role: AccountRole.WRITABLE },
        { address: args.reviewer, role: AccountRole.READONLY_SIGNER },
      ],
      data: buildInstructionData(
        "approve_work",
        u64ArgEncoder.encode(BigInt(args.bountyId)),
      ),
    };
  }

  async buildRejectWorkIx(args: {
    reviewer: Address;
    workspace: Address;
    bountyId: bigint | number;
    contributorReputation?: Address | null;
  }): Promise<Instruction> {
    const [bounty] = await deriveBountyPda(
      args.workspace,
      args.bountyId,
      this.programId,
    );
    const accounts: AccountMeta[] = [
      { address: args.workspace, role: AccountRole.READONLY },
      { address: bounty, role: AccountRole.WRITABLE },
      { address: args.reviewer, role: AccountRole.READONLY_SIGNER },
      {
        address: args.contributorReputation ?? this.programId,
        role: AccountRole.READONLY,
      },
    ];
    return {
      programAddress: this.programId,
      accounts,
      data: buildInstructionData(
        "reject_work",
        u64ArgEncoder.encode(BigInt(args.bountyId)),
      ),
    };
  }

  async buildFinalizePayoutIx(args: {
    caller: Address;
    workspace: Address;
    contributor: Address;
    feeRecipient: Address;
    bountyId: bigint | number;
    contributorReputation?: Address | null;
  }): Promise<Instruction> {
    const [bounty] = await deriveBountyPda(
      args.workspace,
      args.bountyId,
      this.programId,
    );
    const [vault] = await deriveEscrowVaultPda(bounty, this.programId);
    return {
      programAddress: this.programId,
      accounts: [
        { address: args.workspace, role: AccountRole.READONLY },
        { address: bounty, role: AccountRole.WRITABLE },
        { address: vault, role: AccountRole.WRITABLE },
        { address: args.contributor, role: AccountRole.WRITABLE },
        {
          address: args.contributorReputation ?? this.programId,
          role: args.contributorReputation
            ? AccountRole.WRITABLE
            : AccountRole.READONLY,
        },
        { address: args.feeRecipient, role: AccountRole.WRITABLE },
        { address: args.caller, role: AccountRole.READONLY_SIGNER },
        { address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
      ],
      data: buildInstructionData(
        "finalize_payout",
        u64ArgEncoder.encode(BigInt(args.bountyId)),
      ),
    };
  }

  async buildCancelBountyIx(args: {
    sponsor: Address;
    workspace: Address;
    bountyId: bigint | number;
  }): Promise<Instruction> {
    const [bounty] = await deriveBountyPda(
      args.workspace,
      args.bountyId,
      this.programId,
    );
    const [vault] = await deriveEscrowVaultPda(bounty, this.programId);
    return {
      programAddress: this.programId,
      accounts: [
        { address: args.workspace, role: AccountRole.READONLY },
        { address: bounty, role: AccountRole.WRITABLE },
        { address: vault, role: AccountRole.WRITABLE },
        { address: args.sponsor, role: AccountRole.WRITABLE_SIGNER },
        { address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
      ],
      data: buildInstructionData(
        "cancel_bounty",
        u64ArgEncoder.encode(BigInt(args.bountyId)),
      ),
    };
  }

  async buildReclaimExpiredIx(args: {
    caller: Address;
    sponsor: Address;
    workspace: Address;
    bountyId: bigint | number;
  }): Promise<Instruction> {
    const [bounty] = await deriveBountyPda(
      args.workspace,
      args.bountyId,
      this.programId,
    );
    const [vault] = await deriveEscrowVaultPda(bounty, this.programId);
    return {
      programAddress: this.programId,
      accounts: [
        { address: args.workspace, role: AccountRole.READONLY },
        { address: bounty, role: AccountRole.WRITABLE },
        { address: vault, role: AccountRole.WRITABLE },
        { address: args.sponsor, role: AccountRole.WRITABLE },
        { address: args.caller, role: AccountRole.READONLY_SIGNER },
        { address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
      ],
      data: buildInstructionData(
        "reclaim_expired",
        u64ArgEncoder.encode(BigInt(args.bountyId)),
      ),
    };
  }

  async buildChallengeBountyIx(args: {
    challenger: Address;
    respondent: Address;
    workspace: Address;
    bountyId: bigint | number;
    challengeEvidenceHash: Uint8Array;
    arbiterCandidates: Address[];
  }): Promise<{
    instruction: Instruction;
    dispute: Address;
    disputeVault: Address;
  }> {
    const [bounty] = await deriveBountyPda(
      args.workspace,
      args.bountyId,
      this.programId,
    );
    const [dispute] = await deriveDisputePda(bounty, this.programId);
    const [disputeVault] = await deriveDisputeVaultPda(dispute, this.programId);
    const accounts: AccountMeta[] = [
      { address: args.workspace, role: AccountRole.READONLY },
      { address: bounty, role: AccountRole.WRITABLE },
      { address: dispute, role: AccountRole.WRITABLE },
      { address: disputeVault, role: AccountRole.WRITABLE },
      { address: args.challenger, role: AccountRole.WRITABLE_SIGNER },
      { address: args.respondent, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
      ...args.arbiterCandidates.map((addr) => ({
        address: addr,
        role: AccountRole.READONLY,
      })),
    ];
    return {
      dispute,
      disputeVault,
      instruction: {
        programAddress: this.programId,
        accounts,
        data: buildInstructionData(
          "challenge_bounty",
          bountyHashArgsEncoder.encode({
            bountyId: BigInt(args.bountyId),
            hash: assertBytes32(
              args.challengeEvidenceHash,
              "challengeEvidenceHash",
            ),
          }),
        ),
      },
    };
  }

  async buildSubmitDefenseIx(args: {
    respondent: Address;
    workspace: Address;
    bountyId: bigint | number;
    defenseEvidenceHash: Uint8Array;
  }): Promise<Instruction> {
    const [bounty] = await deriveBountyPda(
      args.workspace,
      args.bountyId,
      this.programId,
    );
    const [dispute] = await deriveDisputePda(bounty, this.programId);
    const [disputeVault] = await deriveDisputeVaultPda(dispute, this.programId);
    return {
      programAddress: this.programId,
      accounts: [
        { address: args.workspace, role: AccountRole.READONLY },
        { address: bounty, role: AccountRole.WRITABLE },
        { address: dispute, role: AccountRole.WRITABLE },
        { address: disputeVault, role: AccountRole.WRITABLE },
        { address: args.respondent, role: AccountRole.WRITABLE_SIGNER },
        { address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
      ],
      data: buildInstructionData(
        "submit_defense",
        bountyHashArgsEncoder.encode({
          bountyId: BigInt(args.bountyId),
          hash: assertBytes32(args.defenseEvidenceHash, "defenseEvidenceHash"),
        }),
      ),
    };
  }

  async buildVoteDisputeIx(args: {
    arbiter: Address;
    workspace: Address;
    bountyId: bigint | number;
    side: DisputeVoteSide;
  }): Promise<Instruction> {
    const [bounty] = await deriveBountyPda(
      args.workspace,
      args.bountyId,
      this.programId,
    );
    const [dispute] = await deriveDisputePda(bounty, this.programId);
    return {
      programAddress: this.programId,
      accounts: [
        { address: args.workspace, role: AccountRole.READONLY },
        { address: bounty, role: AccountRole.READONLY },
        { address: dispute, role: AccountRole.WRITABLE },
        { address: args.arbiter, role: AccountRole.READONLY_SIGNER },
      ],
      data: buildInstructionData(
        "vote_dispute",
        voteDisputeArgsEncoder.encode({
          bountyId: BigInt(args.bountyId),
          side: args.side === "Challenger" ? 0 : 1,
        }),
      ),
    };
  }

  async buildResolveDisputeIx(args: {
    caller: Address;
    workspace: Address;
    sponsor: Address;
    winner: Address;
    loser: Address;
    feeRecipient: Address;
    bountyId: bigint | number;
    arbiters: Address[];
    winnerReputation?: Address | null;
    loserReputation?: Address | null;
    reviewerReputation?: Address | null;
  }): Promise<Instruction> {
    const [bounty] = await deriveBountyPda(
      args.workspace,
      args.bountyId,
      this.programId,
    );
    const [bountyVault] = await deriveEscrowVaultPda(bounty, this.programId);
    const [dispute] = await deriveDisputePda(bounty, this.programId);
    const [disputeVault] = await deriveDisputeVaultPda(dispute, this.programId);
    const accounts: AccountMeta[] = [
      { address: args.workspace, role: AccountRole.READONLY },
      { address: bounty, role: AccountRole.WRITABLE },
      { address: dispute, role: AccountRole.WRITABLE },
      { address: bountyVault, role: AccountRole.WRITABLE },
      { address: disputeVault, role: AccountRole.WRITABLE },
      { address: args.sponsor, role: AccountRole.WRITABLE },
      { address: args.winner, role: AccountRole.WRITABLE },
      { address: args.loser, role: AccountRole.READONLY },
      { address: args.feeRecipient, role: AccountRole.WRITABLE },
      { address: args.caller, role: AccountRole.READONLY_SIGNER },
      { address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
      {
        address: args.winnerReputation ?? this.programId,
        role: args.winnerReputation
          ? AccountRole.WRITABLE
          : AccountRole.READONLY,
      },
      {
        address: args.loserReputation ?? this.programId,
        role: args.loserReputation
          ? AccountRole.WRITABLE
          : AccountRole.READONLY,
      },
      {
        address: args.reviewerReputation ?? this.programId,
        role: AccountRole.READONLY,
      },
      ...args.arbiters.map((addr) => ({
        address: addr,
        role: AccountRole.WRITABLE,
      })),
    ];
    return {
      programAddress: this.programId,
      accounts,
      data: buildInstructionData(
        "resolve_dispute",
        u64ArgEncoder.encode(BigInt(args.bountyId)),
      ),
    };
  }
}
