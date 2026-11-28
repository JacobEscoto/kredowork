import {
  address,
  signature as toSignature,
  type Address,
  type Rpc,
  type SolanaRpcApi,
} from "@solana/kit";
import { config } from "./config.js";
import { supabase } from "./supabase.js";
import {
  bytesToHex,
  decodeBase58Instruction,
  decodeBase64Account,
  deriveVaultPda,
  mapBountyStatus,
  mapDisputeResolution,
} from "./decoder.js";

const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
const processedSignatures = new Set<string>();

function extractEventPdas(
  instructionName: string,
  ixAccounts: Address[],
): { workspacePda: string | null; bountyPda: string | null } {
  switch (instructionName) {
    case "initialize_workspace":
    case "update_workspace":
    case "set_paused":
      return { workspacePda: ixAccounts[0] ?? null, bountyPda: null };
    case "initialize_reputation":
      return { workspacePda: null, bountyPda: null };
    default:
      return {
        workspacePda: ixAccounts[0] ?? null,
        bountyPda: ixAccounts[1] ?? null,
      };
  }
}

export async function processTransaction(
  rpc: Rpc<SolanaRpcApi>,
  sigStr: string,
) {
  if (processedSignatures.has(sigStr)) return;

  const tx = await rpc
    .getTransaction(toSignature(sigStr), {
      commitment: "confirmed",
      encoding: "json",
      maxSupportedTransactionVersion: 0,
    })
    .send();

  if (!tx) return;
  processedSignatures.add(sigStr);
  if (tx.meta?.err) return;

  const blockTime = tx.blockTime ? Number(tx.blockTime) : null;

  const staticKeys = tx.transaction.message.accountKeys.map((k) => address(k));
  const loadedWritable = (tx.meta?.loadedAddresses?.writable ?? []).map((k) =>
    address(k),
  );
  const loadedReadonly = (tx.meta?.loadedAddresses?.readonly ?? []).map((k) =>
    address(k),
  );
  const allAccountKeys: Address[] = [
    ...staticKeys,
    ...loadedWritable,
    ...loadedReadonly,
  ];

  // Record program instructions in protocol_events
  let eventIndex = 0;
  for (const ix of tx.transaction.message.instructions) {
    const programAddr = allAccountKeys[ix.programIdIndex];
    if (!programAddr || programAddr !== config.programId) continue;

    const decodedIx = decodeBase58Instruction(ix.data);
    const eventName = decodedIx?.name ?? "unknown_instruction";
    const ixAccounts = ix.accounts
      .map((idx) => allAccountKeys[idx])
      .filter(Boolean);
    const { workspacePda, bountyPda } = extractEventPdas(eventName, ixAccounts);

    const { error } = await supabase.from("protocol_events").upsert(
      {
        tx_signature: sigStr,
        event_index: eventIndex++,
        slot: Number(tx.slot),
        block_time: blockTime,
        event_name: eventName,
        workspace_pda: workspacePda,
        bounty_pda: bountyPda,
        raw_data: {
          instruction: eventName,
          args: decodedIx?.data ?? null,
          accounts: ixAccounts,
        },
        indexed_at: new Date().toISOString(),
      },
      { onConflict: "tx_signature,event_index" },
    );

    if (error) {
      console.error(
        `[indexer] Error upserting protocol_event (${sigStr}):`,
        error.message,
      );
    }
  }

  if (allAccountKeys.length === 0) return;

  // Read the program's PDA accounts and sort them by dependency (Workspace -> Bounty -> Dispute -> Reputation)
  const { value: accountsInfo } = await rpc
    .getMultipleAccounts(allAccountKeys, {
      commitment: "confirmed",
      encoding: "base64",
    })
    .send();

  const workspaces: Array<{ addr: Address; decoded: any }> = [];
  const bounties: Array<{ addr: Address; decoded: any }> = [];
  const disputes: Array<{ addr: Address; decoded: any }> = [];
  const reputations: Array<{ addr: Address; decoded: any }> = [];

  for (let i = 0; i < accountsInfo.length; i++) {
    const info = accountsInfo[i];
    if (!info || info.owner !== config.programId) continue;

    const [base64Data] = info.data;
    const parsed = decodeBase64Account(base64Data);
    if (!parsed) continue;

    const addr = allAccountKeys[i];
    if (parsed.kind === "WorkspaceConfig")
      workspaces.push({ addr, decoded: parsed.decoded });
    else if (parsed.kind === "BountyAccount")
      bounties.push({ addr, decoded: parsed.decoded });
    else if (parsed.kind === "DisputeAccount")
      disputes.push({ addr, decoded: parsed.decoded });
    else if (parsed.kind === "ReputationProfile")
      reputations.push({ addr, decoded: parsed.decoded });
  }

  for (const w of workspaces) {
    await syncWorkspace(w.addr, w.decoded, Number(tx.slot));
  }
  for (const b of bounties) {
    await syncBounty(rpc, b.addr, b.decoded, sigStr, Number(tx.slot));
  }
  for (const d of disputes) {
    await syncDispute(
      rpc,
      d.addr,
      d.decoded,
      sigStr,
      Number(tx.slot),
      blockTime,
    );
  }
  for (const r of reputations) {
    await syncReputation(r.addr, r.decoded);
  }
}

async function ensureWorkspaceExists(
  rpc: Rpc<SolanaRpcApi>,
  workspaceAddr: Address,
  fallbackSlot: number,
) {
  const { data } = await supabase
    .from("workspaces")
    .select("workspace_pda, fee_bps")
    .eq("workspace_pda", workspaceAddr)
    .maybeSingle();

  if (data) return data;

  const { value: info } = await rpc
    .getAccountInfo(workspaceAddr, {
      commitment: "confirmed",
      encoding: "base64",
    })
    .send();

  if (!info || info.owner !== config.programId) return null;
  const parsed = decodeBase64Account(info.data[0]);
  if (parsed?.kind === "WorkspaceConfig") {
    await syncWorkspace(workspaceAddr, parsed.decoded, fallbackSlot);
    return {
      workspace_pda: workspaceAddr,
      fee_bps: Number(parsed.decoded.fee_bps ?? 0),
    };
  }
  return null;
}

async function ensureBountyExists(
  rpc: Rpc<SolanaRpcApi>,
  bountyAddr: Address,
  signature: string,
  fallbackSlot: number,
) {
  const { data } = await supabase
    .from("bounties")
    .select("bounty_pda")
    .eq("bounty_pda", bountyAddr)
    .maybeSingle();

  if (data) return;

  const { value: info } = await rpc
    .getAccountInfo(bountyAddr, { commitment: "confirmed", encoding: "base64" })
    .send();

  if (!info || info.owner !== config.programId) return;
  const parsed = decodeBase64Account(info.data[0]);
  if (parsed?.kind === "BountyAccount") {
    await syncBounty(rpc, bountyAddr, parsed.decoded, signature, fallbackSlot);
  }
}

async function syncWorkspace(workspacePda: string, data: any, slot: number) {
  const { data: existing } = await supabase
    .from("workspaces")
    .select("name, description, arbitrators")
    .eq("workspace_pda", workspacePda)
    .maybeSingle();

  const workspaceId = data.workspace_id?.toString?.() ?? "0";
  const reviewers = Array.isArray(data.reviewers)
    ? data.reviewers.map((p: { toBase58(): string }) => p.toBase58())
    : [];

  const { error } = await supabase.from("workspaces").upsert(
    {
      workspace_pda: workspacePda,
      authority_pubkey: data.authority.toBase58(),
      name: existing?.name ?? `Workspace #${workspaceId}`,
      description: existing?.description ?? null,
      reviewers,
      arbitrators: existing?.arbitrators?.length
        ? existing.arbitrators
        : reviewers,
      quorum_threshold: Number(data.quorum_threshold ?? 1),
      max_submission_attempts: Number(data.max_submission_attempts ?? 1),
      review_timeout_secs: Number(data.review_timeout_secs ?? 0),
      fee_bps: Number(data.fee_bps ?? 0),
      challenge_bond_bps: Number(data.bond_bps ?? 0),
      optimistic_window_sec: Number(data.challenge_window_secs ?? 60),
      is_paused: Boolean(data.is_paused),
      created_at_slot: slot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_pda" },
  );

  if (error) {
    console.error(
      `[indexer] Error upserting workspace ${workspacePda}:`,
      error.message,
    );
  }
}

async function syncBounty(
  rpc: Rpc<SolanaRpcApi>,
  bountyPda: Address,
  data: any,
  signature: string,
  slot: number,
) {
  const workspacePda = address(data.workspace.toBase58());
  const ws = await ensureWorkspaceExists(rpc, workspacePda, slot);

  const { data: existing } = await supabase
    .from("bounties")
    .select("spec_title, spec_payload, delivery_payload")
    .eq("bounty_pda", bountyPda)
    .maybeSingle();

  const vaultPda = await deriveVaultPda(bountyPda, config.programId);
  const status = mapBountyStatus(data.status);
  const windowEnds = data.window_ends_at_ts
    ? Number(data.window_ends_at_ts.toString())
    : null;

  const rewardLamports = BigInt(data.reward_amount.toString());
  const feeBps = BigInt(ws?.fee_bps ?? 0);
  const feeLamports = ((rewardLamports * feeBps) / 10_000n).toString();

  const { error } = await supabase.from("bounties").upsert(
    {
      bounty_pda: bountyPda,
      workspace_pda: workspacePda,
      vault_pda: vaultPda,
      creator_pubkey: data.sponsor.toBase58(),
      contributor_pubkey: data.claimant ? data.claimant.toBase58() : null,
      status,
      reward_lamports: rewardLamports.toString(),
      fee_lamports: feeLamports,
      approvals_count: Number(data.approvals_count ?? 0),
      approvals_mask: Number(data.approvals_mask ?? 0),
      submission_attempts: Number(data.submission_attempts ?? 0),
      spec_hash: bytesToHex(data.spec_hash),
      spec_title:
        existing?.spec_title ?? `Bounty #${data.bounty_id.toString()}`,
      spec_payload: existing?.spec_payload ?? null,
      delivery_hash: data.delivery_hash ? bytesToHex(data.delivery_hash) : null,
      delivery_payload: existing?.delivery_payload ?? null,
      review_deadline_ts: status === "SUBMITTED" ? windowEnds : null,
      optimistic_until_ts: status === "PRE_APPROVED" ? windowEnds : null,
      global_deadline_ts: Number(data.deadline_ts.toString()),
      last_tx_signature: signature,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "bounty_pda" },
  );

  if (error) {
    console.error(
      `[indexer] Error upserting bounty ${bountyPda}:`,
      error.message,
    );
  }
}

async function syncDispute(
  rpc: Rpc<SolanaRpcApi>,
  disputePda: string,
  data: any,
  signature: string,
  slot: number,
  blockTime: number | null,
) {
  const bountyPda = address(data.bounty.toBase58());
  await ensureBountyExists(rpc, bountyPda, signature, slot);

  const { data: existing } = await supabase
    .from("disputes")
    .select("challenge_evidence_payload, defense_evidence_payload, resolved_at")
    .eq("dispute_pda", disputePda)
    .maybeSingle();

  const resolution = mapDisputeResolution(data.status);
  const arbiters = Array.isArray(data.arbiters)
    ? data.arbiters
        .filter(Boolean)
        .map((p: { toBase58(): string }) => p.toBase58())
        .filter((addr: string) => addr !== SYSTEM_PROGRAM_ID)
    : [];

  const resolvedTimestamp =
    resolution !== "PENDING"
      ? (existing?.resolved_at ??
        (blockTime
          ? new Date(blockTime * 1000).toISOString()
          : new Date().toISOString()))
      : null;

  const { error } = await supabase.from("disputes").upsert(
    {
      dispute_pda: disputePda,
      bounty_pda: bountyPda,
      challenger_pubkey: data.challenger.toBase58(),
      respondent_pubkey: data.respondent ? data.respondent.toBase58() : null,
      challenger_bond_lamports: data.challenge_bond.toString(),
      respondent_bond_lamports: data.defense_bond.toString(),
      challenge_evidence_hash: bytesToHex(data.challenge_evidence_hash),
      challenge_evidence_payload: existing?.challenge_evidence_payload ?? null,
      defense_evidence_hash: data.defense_evidence_hash
        ? bytesToHex(data.defense_evidence_hash)
        : null,
      defense_evidence_payload: existing?.defense_evidence_payload ?? null,
      arbitrators: arbiters,
      votes: {
        for_challenger: Number(data.votes_for_challenger ?? 0),
        for_respondent: Number(data.votes_for_respondent ?? 0),
        votes_mask: Number(data.votes_mask ?? 0),
      },
      resolution,
      resolved_at: resolvedTimestamp,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "dispute_pda" },
  );

  if (error) {
    console.error(
      `[indexer] Error upserting dispute ${disputePda}:`,
      error.message,
    );
  }
}

async function syncReputation(profilePda: string, data: any) {
  const ownerPubkey = data.owner.toBase58();

  const { data: linkedUser } = await supabase
    .from("users")
    .select("id")
    .eq("primary_wallet_pubkey", ownerPubkey)
    .maybeSingle();

  const { error } = await supabase.from("reputation_profiles").upsert(
    {
      wallet_pubkey: ownerPubkey,
      profile_pda: profilePda,
      bounties_completed: Number(data.bounties_completed ?? 0),
      bounties_failed: Number(data.bounties_rejected ?? 0),
      total_earned_lamports: data.total_earned.toString(),
      reputation_score: Number(data.reputation_score ?? 0),
      reviews_completed: 0,
      reviews_overturned: Number(data.overturned_reviews ?? 0),
      disputes_won: Number(data.disputes_won ?? 0),
      disputes_lost: Number(data.disputes_lost ?? 0),
      arbitrations_cast: 0,
      user_id: linkedUser?.id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "wallet_pubkey" },
  );

  if (error) {
    console.error(
      `[indexer] Error upserting reputation ${profilePda}:`,
      error.message,
    );
  }
}
