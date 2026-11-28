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
    <div className="w-full">
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={busy}
        className="flex items-center gap-3 w-full min-h-15.5 py-2.5 px-3 rounded-md border border-[#e5e8e2] bg-white text-foreground text-left cursor-pointer mb-2.5 transition-colors duration-180 hover:border-[#c5d0be] hover:bg-[#fbfcfa] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-3"
      >
        <span
          className="grid place-items-center flex-none w-9 h-9 text-[#171a15]"
          aria-hidden="true"
        >
          {busy ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <SiGithub size={17} />
          )}
        </span>
        <span className="flex flex-1 flex-col gap-1 min-w-0">
          <strong className="text-[11px] font-semibold truncate">
            {busy ? "Connecting to GitHub…" : "Continue with GitHub"}
          </strong>
          <span className="text-[#82877d] text-[9px] truncate">
            Use your GitHub account to sign in
          </span>
        </span>
      </button>
      {error && (
        <p
          className="m-0 p-3 border border-[#e4c5a3] bg-[#fffaf4] text-[#59442f] text-[11px]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
