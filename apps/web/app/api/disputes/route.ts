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
  const { dispute_pda, bounty_pda, challenge_evidence_payload, defense_evidence_payload } = body;
  if (typeof dispute_pda !== "string" || !isAddress(dispute_pda) || typeof bounty_pda !== "string" || !isAddress(bounty_pda)) {
    return NextResponse.json({ error: "A valid dispute_pda and bounty_pda are required" }, { status: 400 });
  }
  const update: Record<string, unknown> = { dispute_pda, bounty_pda };
  for (const key of ["challenge_evidence_payload", "defense_evidence_payload"] as const) {
    if (key in body) {
      const payload = body[key];
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 });
      }
      update[key] = payload;
    }
  }
  if (!("challenge_evidence_payload" in update) && !("defense_evidence_payload" in update)) {
    return NextResponse.json({ error: "Evidence payload is required" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("disputes").upsert(update, { onConflict: "dispute_pda" });
  if (error) {
    console.error("Dispute metadata upsert failed:", error);
    return NextResponse.json({ error: "Could not save dispute metadata" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
