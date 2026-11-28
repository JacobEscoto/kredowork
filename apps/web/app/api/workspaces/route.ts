import { NextResponse } from "next/server";
import { isAddress } from "@solana/kit";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { workspace_pda, authority_pubkey, name, description, reviewers, fee_bps, challenge_bond_bps, optimistic_window_sec } = body;
  if (
    typeof workspace_pda !== "string" || !isAddress(workspace_pda) ||
    typeof authority_pubkey !== "string" || !isAddress(authority_pubkey) ||
    typeof name !== "string" || !name.trim() || name.length > 60 ||
    typeof description !== "string" || description.length > 280 ||
    !Array.isArray(reviewers) || reviewers.length < 1 || reviewers.length > 8 ||
    !reviewers.every((reviewer) => typeof reviewer === "string" && isAddress(reviewer)) ||
    new Set(reviewers).size !== reviewers.length ||
    !Number.isInteger(fee_bps) || Number(fee_bps) < 0 || Number(fee_bps) > 10_000 ||
    !Number.isInteger(challenge_bond_bps) || Number(challenge_bond_bps) < 0 || Number(challenge_bond_bps) > 10_000 ||
    !Number.isInteger(optimistic_window_sec) || Number(optimistic_window_sec) <= 0
  ) {
    return NextResponse.json({ error: "Invalid workspace metadata" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("workspaces").upsert({
    workspace_pda,
    authority_pubkey,
    name: name.trim(),
    description: description.trim(),
    reviewers,
    fee_bps,
    challenge_bond_bps,
    optimistic_window_sec,
  }, { onConflict: "workspace_pda" }).select("workspace_pda").single();
  if (error) {
    console.error("Workspace metadata upsert failed:", error);
    return NextResponse.json({ error: "Could not save workspace metadata" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, workspace: data });
}
