import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const update: Record<string, unknown> = {};
  if ("delivery_hash" in body) {
    if (typeof body.delivery_hash !== "string" || !/^[0-9a-f]{64}$/i.test(body.delivery_hash)) {
      return NextResponse.json({ error: "Invalid delivery hash" }, { status: 400 });
    }
    update.delivery_hash = body.delivery_hash.toLowerCase();
  }
  if ("delivery_payload" in body) {
    if (!body.delivery_payload || typeof body.delivery_payload !== "object" || Array.isArray(body.delivery_payload)) {
      return NextResponse.json({ error: "Invalid delivery payload" }, { status: 400 });
    }
    update.delivery_payload = body.delivery_payload;
  }
  if ("status" in body) {
    const allowed = ["OPEN", "SUBMITTED", "PRE_APPROVED", "REJECTED", "DISPUTED", "COMPLETED", "EXPIRED", "CANCELLED"];
    if (typeof body.status !== "string" || !allowed.includes(body.status)) {
      return NextResponse.json({ error: "Invalid bounty status" }, { status: 400 });
    }
    update.status = body.status;
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: "No supported fields provided" }, { status: 400 });
  const { error } = await supabaseAdmin.from("bounties").update(update).eq("bounty_pda", id);
  if (error) {
    console.error("Bounty metadata update failed:", error);
    return NextResponse.json({ error: "Could not update bounty metadata" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
