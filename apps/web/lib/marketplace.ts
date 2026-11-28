import "server-only";
import { createClient } from "@supabase/supabase-js";

export type MarketplaceStatus =
  | "OPEN"
  | "CLAIMED"
  | "SUBMITTED"
  | "PRE_APPROVED"
  | "COMPLETED"
  | "EXPIRED"
  | "DISPUTED"
  | "REJECTED";

export type MarketplaceBounty = {
  id: string;
  title: string;
  summary: string;
  amount: number;
  status: MarketplaceStatus;
  deadline: string;
  days: number;
  approval: string;
  hash: string;
  space: string;
  initials: string;
};

type BountyRow = {
  id: string;
  workspace_pda: string;
  creator_pubkey: string;
  contributor_pubkey: string | null;
  status: string;
  reward_lamports: number | string;
  spec_hash: string;
  spec_title: string | null;
  spec_payload: Record<string, unknown> | null;
  global_deadline_ts: number | string | null;
  claim_deadline_ts: number | string | null;
  review_deadline_ts: number | string | null;
  created_at: string;
};

type WorkspaceRow = { workspace_pda: string; name: string; reviewers: unknown[] };

export type ReputationMetrics = {
  bounties_completed: number;
  bounties_failed: number;
  total_earned_lamports: number | string;
  reviews_completed: number;
  reviews_overturned: number;
  disputes_won: number;
  disputes_lost: number;
  arbitrations_cast: number;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public environment is not configured.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeStatus(value: string): MarketplaceStatus {
  const status = value.toUpperCase().replace(/[^A-Z]/g, "");
  if (status === "PREAPPROVED") return "PRE_APPROVED";
  if (status === "COMPLETE" || status === "COMPLETED") return "COMPLETED";
  if (status === "CANCELLED" || status === "EXPIRED") return "EXPIRED";
  if (status === "DISPUTED") return "DISPUTED";
  if (status === "REJECTED") return "REJECTED";
  if (status === "SUBMITTED") return "SUBMITTED";
  if (status === "CLAIMED") return "CLAIMED";
  return "OPEN";
}

export async function getReputationMetrics(wallet: string): Promise<ReputationMetrics | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reputation_profiles")
    .select("bounties_completed, bounties_failed, total_earned_lamports, reviews_completed, reviews_overturned, disputes_won, disputes_lost, arbitrations_cast")
    .eq("wallet_pubkey", wallet)
    .maybeSingle();
  if (error) throw new Error(`Could not load reputation profile: ${error.message}`);
  return data as ReputationMetrics | null;
}


function deadlineDetails(value: number | string | null) {
  if (value === null) return { deadline: "No deadline", days: 0 };
  const timestamp = Number(value);
  const date = new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp);
  if (!Number.isFinite(date.getTime())) return { deadline: "No deadline", days: 0 };
  const days = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
  return {
    deadline: new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date),
    days,
  };
}

export async function getMarketplaceBounties(): Promise<MarketplaceBounty[]> {
  const supabase = getSupabase();
  const [{ data: bountyRows, error: bountyError }, { data: workspaceRows, error: workspaceError }] =
    await Promise.all([
      supabase
        .from("bounties")
        .select("id, workspace_pda, creator_pubkey, contributor_pubkey, status, reward_lamports, spec_hash, spec_title, spec_payload, global_deadline_ts, claim_deadline_ts, review_deadline_ts, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("workspaces").select("workspace_pda, name, reviewers"),
    ]);

  if (bountyError) throw new Error(`Could not load marketplace bounties: ${bountyError.message}`);
  if (workspaceError) throw new Error(`Could not load workspaces: ${workspaceError.message}`);

  const workspaces = new Map(
    ((workspaceRows ?? []) as WorkspaceRow[]).map((workspace) => [workspace.workspace_pda, workspace]),
  );

  return ((bountyRows ?? []) as BountyRow[]).map((row) => {
    const workspace = workspaces.get(row.workspace_pda);
    const payload = row.spec_payload ?? {};
    const summary = typeof payload.description === "string"
      ? payload.description
      : typeof payload.summary === "string"
        ? payload.summary
        : "Open bounty details to review the full specification.";
    const { deadline, days } = deadlineDetails(
      row.global_deadline_ts ?? row.claim_deadline_ts ?? row.review_deadline_ts,
    );
    return {
      id: row.id,
      title: row.spec_title || (typeof payload.title === "string" ? payload.title : "Untitled bounty"),
      summary,
      amount: Number(row.reward_lamports) / 1_000_000_000,
      status: normalizeStatus(row.status),
      deadline,
      days,
      approval: workspace?.reviewers?.length ? "Workspace reviewers" : "Review required",
      hash: row.spec_hash,
      space: workspace?.name ?? "KredoWork workspace",
      initials: (workspace?.name ?? "KW").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
    };
  });
}
