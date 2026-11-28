"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, LoaderCircle } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useTranslation } from "@/components/language-provider";

export default function SignOutButton() {
  const router = useRouter();
  const { translate: t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setPending(true);
    setError("");

    try {
      const result = await supabaseBrowser.auth.signOut();
      if (result.error) {
        setError(t("auth.signOutFailed"));
        setPending(false);
        return;
      }

      router.replace("/register");
      router.refresh();
    } catch {
      setError(t("auth.signOutFailed"));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start">
      <button
        className="flex items-center gap-2 min-h-[46px] px-[15px] rounded-md border border-[#e1e5dd] bg-white text-[#32372e] text-[11px] cursor-pointer transition-colors duration-180 hover:border-[#c5d0be] hover:bg-[#fbfcfa] disabled:cursor-wait disabled:opacity-72 focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-3 max-[460px]:min-h-[42px] max-[460px]:px-[11px] max-[460px]:text-[10px]"
        type="button"
        onClick={() => void signOut()}
        disabled={pending}
      >
        {pending ? (
          <LoaderCircle
            className="animate-spin"
            size={15}
            aria-hidden="true"
          />
        ) : (
          <LogOut size={15} aria-hidden="true" />
        )}
        {pending ? t("auth.signingOut") : t("auth.signOut")}
      </button>
      {error && (
        <p className="mt-2 text-[#a24132] text-[10px] leading-[1.5]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
