"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function GitHubSignInButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const redirectTo = new URL(
      "/auth/callback?next=/account",
      window.location.origin,
    ).toString();
    const { error: signInError } = await supabaseBrowser.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });
    if (signInError) {
      setError(signInError.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={busy}
        className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-md border border-[#d5dacf] bg-white px-3 py-2.5 text-left text-foreground transition-colors duration-180 hover:border-[#171a15] hover:bg-[#f7f8f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:cursor-wait disabled:opacity-70"
      >
        <span
          className="grid size-8 flex-none place-items-center text-[#171a15] sm:size-9"
          aria-hidden="true"
        >
          {busy ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <SiGithub size={18} />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <strong className="truncate text-[13px] font-semibold">
            {busy ? "Connecting to GitHub…" : "Continue with GitHub"}
          </strong>
          <span className="truncate text-xs text-[#6b7066]">
            Use your GitHub account to sign in
          </span>
        </span>
      </button>
      {error && (
        <p
          className="m-0 border border-[#e4c5a3] bg-[#fffaf4] p-3 text-xs leading-normal text-[#59442f]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
