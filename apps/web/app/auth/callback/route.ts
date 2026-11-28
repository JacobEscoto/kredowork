import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

function getSafeNextPath(nextParam: string | null): string {
  if (!nextParam || !nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return "/bounties";
  }
  return nextParam;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = getSafeNextPath(searchParams.get("next"));

  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  if (oauthError || !code) {
    const redirectUrl = new URL(`${origin}/register`);
    redirectUrl.searchParams.set(
      "error",
      oauthError ?? "oauth_callback_failed",
    );
    if (oauthErrorDescription) {
      redirectUrl.searchParams.set("error_description", oauthErrorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  const cookieStore = await cookies();
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      `${origin}/register?error=oauth_exchange_failed`,
    );
  }

  const authUser = data.user;
  const meta = authUser.user_metadata ?? {};
  const githubUsername =
    typeof meta.user_name === "string"
      ? meta.user_name
      : typeof meta.preferred_username === "string"
        ? meta.preferred_username
        : null;

  const displayName =
    typeof meta.full_name === "string" && meta.full_name.trim().length > 0
      ? meta.full_name.trim()
      : typeof meta.name === "string" && meta.name.trim().length > 0
        ? meta.name.trim()
        : githubUsername;

  const avatarUrl =
    typeof meta.avatar_url === "string" ? meta.avatar_url : null;
  const githubId =
    typeof meta.provider_id === "string"
      ? meta.provider_id
      : typeof meta.sub === "string"
        ? meta.sub
        : authUser.id;
  const nowIso = new Date().toISOString();

  const { error: userUpsertError } = await supabaseAdmin.from("users").upsert(
    {
      id: authUser.id,
      display_name: displayName,
      avatar_url: avatarUrl,
      github_username: githubUsername,
      email: authUser.email ?? null,
      updated_at: nowIso,
    },
    { onConflict: "id" },
  );

  if (userUpsertError) {
    console.error(
      "Error upserting public.users on GitHub login:",
      userUpsertError,
    );
    return NextResponse.redirect(
      `${origin}/register?error=profile_sync_failed`,
    );
  }

  const { error: identityUpsertError } = await supabaseAdmin
    .from("user_identities")
    .upsert(
      {
        user_id: authUser.id,
        provider: "github",
        provider_subject: githubId,
        verified_at: nowIso,
      },
      { onConflict: "provider,provider_subject" },
    );

  if (identityUpsertError) {
    console.error(
      "Error upserting public.user_identities on GitHub login:",
      identityUpsertError,
    );
    return NextResponse.redirect(
      `${origin}/register?error=identity_sync_failed`,
    );
  }

  return NextResponse.redirect(`${origin}${nextPath}`);
}
