import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import {
  address as toAddress,
  getPublicKeyFromAddress,
  signatureBytes,
  verifySignature,
} from "@solana/kit";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

async function verifyWalletSignature(
  address: string,
  signature: string,
  message: string,
) {
  try {
    const bytes = new Uint8Array(Buffer.from(signature, "base64"));
    if (bytes.length !== 64) return false;
    const key = await getPublicKeyFromAddress(toAddress(address));
    return verifySignature(
      key,
      signatureBytes(bytes),
      new TextEncoder().encode(message),
    );
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  if (!address) {
    return NextResponse.json({ verified: false }, { status: 400 });
  }

  const { data: identity } = await supabaseAdmin
    .from("user_identities")
    .select("user_id, verified_at")
    .eq("provider", "solana_wallet")
    .eq("provider_subject", address)
    .maybeSingle();

  return NextResponse.json({
    verified: Boolean(identity),
    userId: identity?.user_id ?? null,
    verifiedAt: identity?.verified_at ?? null,
  });
}

export async function POST(request: Request) {
  let body: {
    address?: unknown;
    signature?: unknown;
    message?: unknown;
    timestamp?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { address, signature, message, timestamp } = body;
  if (
    typeof address !== "string" ||
    typeof signature !== "string" ||
    typeof message !== "string" ||
    typeof timestamp !== "string"
  ) {
    return NextResponse.json(
      { error: "Wallet, signature, and timestamped message are required" },
      { status: 400 },
    );
  }

  try {
    toAddress(address);
  } catch {
    return NextResponse.json(
      { error: "Invalid wallet address" },
      { status: 400 },
    );
  }

  const issuedAt = Date.parse(timestamp);
  const now = Date.now();
  const expectedMessage = `KredoWork wallet verification\nWallet: ${address}\nTimestamp: ${timestamp}`;
  if (
    !Number.isFinite(issuedAt) ||
    Math.abs(now - issuedAt) > 5 * 60_000 ||
    message !== expectedMessage
  ) {
    return NextResponse.json(
      {
        error: "Challenge is invalid or expired. Please sign a new challenge.",
      },
      { status: 400 },
    );
  }

  if (!(await verifyWalletSignature(address, signature, message))) {
    return NextResponse.json(
      { error: "Invalid wallet signature" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existingIdentity, error: lookupError } = await supabaseAdmin
    .from("user_identities")
    .select("user_id")
    .eq("provider", "solana_wallet")
    .eq("provider_subject", address)
    .maybeSingle();

  if (lookupError) {
    console.error("Wallet identity lookup failed:", lookupError);
    return NextResponse.json(
      { error: "Could not verify wallet identity" },
      { status: 500 },
    );
  }

  let userId: string;
  const nowIso = new Date().toISOString();
  const shortLabel = `${address.slice(0, 4)}…${address.slice(-4)}`;

  if (user) {
    // Authenticated user (e.g., GitHub) linking their wallet.
    if (existingIdentity && existingIdentity.user_id !== user.id) {
      const { data: otherIdentities } = await supabaseAdmin
        .from("user_identities")
        .select("provider")
        .eq("user_id", existingIdentity.user_id)
        .neq("provider", "solana_wallet");

      if (otherIdentities && otherIdentities.length > 0) {
        return NextResponse.json(
          { error: "This wallet is already linked to another account" },
          { status: 409 },
        );
      }

      await supabaseAdmin
        .from("reputation_profiles")
        .update({ user_id: user.id })
        .eq("user_id", existingIdentity.user_id);

      await supabaseAdmin
        .from("user_identities")
        .delete()
        .eq("user_id", existingIdentity.user_id);

      await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", existingIdentity.user_id);
    }

    userId = user.id;
  } else {
    userId = existingIdentity?.user_id ?? randomUUID();
    const syntheticEmail = `${address.toLowerCase()}@wallet.kredowork.local`;

    const { data: authLookup } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (!authLookup?.user) {
      const { error: createAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          id: userId,
          email: syntheticEmail,
          email_confirm: true,
          user_metadata: {
            wallet_address: address,
            full_name: shortLabel,
            auth_method: "solana_wallet",
          },
        });

      if (createAuthError) {
        console.error("Could not provision wallet auth user:", createAuthError);
      }
    }

    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: syntheticEmail,
    });

    const tokenHash = linkData?.properties?.hashed_token;
    if (tokenHash) {
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      });
    }
  }

  const { error: userError } = await supabaseAdmin.from("users").upsert(
    {
      id: userId,
      ...(user ? {} : { display_name: shortLabel }),
      primary_wallet_pubkey: address,
      updated_at: nowIso,
    },
    { onConflict: "id" },
  );

  if (userError) {
    console.error("Wallet profile upsert failed:", userError);
    return NextResponse.json(
      { error: "Could not save wallet profile" },
      { status: 500 },
    );
  }

  const { error: identityError } = await supabaseAdmin
    .from("user_identities")
    .upsert(
      {
        user_id: userId,
        provider: "solana_wallet",
        provider_subject: address,
        verified_at: nowIso,
      },
      { onConflict: "provider,provider_subject" },
    );

  if (identityError) {
    console.error("Wallet identity upsert failed:", identityError);
    return NextResponse.json(
      { error: "Could not link wallet identity" },
      { status: 500 },
    );
  }

  await supabaseAdmin
    .from("reputation_profiles")
    .update({ user_id: userId })
    .eq("wallet_pubkey", address);

  return NextResponse.json({
    ok: true,
    address,
    userId,
    verified: true,
    linkedToAccount: Boolean(user),
  });
}
