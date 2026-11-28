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
  const { bounty_pda, workspace_pda, vault_pda, creator_pubkey, reward_lamports, spec_hash, spec_title, spec_payload, global_deadline_ts, last_tx_signature } = body;
  if (
    typeof bounty_pda !== "string" || !isAddress(bounty_pda) ||
    typeof workspace_pda !== "string" || !isAddress(workspace_pda) ||
    typeof vault_pda !== "string" || !isAddress(vault_pda) ||
    typeof creator_pubkey !== "string" || !isAddress(creator_pubkey) ||
    !/^\d+$/.test(String(reward_lamports)) || BigInt(String(reward_lamports)) <= BigInt(0) ||
    typeof spec_hash !== "string" || !/^(?:[0-9a-f]{64}|[1-9A-HJ-NP-Za-km-z]{43,44})$/i.test(spec_hash) ||
    typeof spec_title !== "string" || !spec_title.trim() || spec_title.length > 90 ||
    !spec_payload || typeof spec_payload !== "object" || Array.isArray(spec_payload) ||
    !Number.isSafeInteger(Number(global_deadline_ts)) || Number(global_deadline_ts) <= 0 ||
    typeof last_tx_signature !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(last_tx_signature)
  ) {
    return NextResponse.json({ error: "Invalid bounty metadata" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.from("bounties").upsert({
    bounty_pda,
    workspace_pda,
    vault_pda,
    creator_pubkey,
    reward_lamports: String(reward_lamports),
    spec_hash,
    spec_title: spec_title.trim(),
    spec_payload,
    global_deadline_ts: Number(global_deadline_ts),
    last_tx_signature,
    status: "OPEN",
  }, { onConflict: "bounty_pda" }).select("bounty_pda").single();
  if (error) {
    console.error("Bounty metadata upsert failed:", error);
    return NextResponse.json({ error: "Could not save bounty metadata" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, bounty: data });
}
