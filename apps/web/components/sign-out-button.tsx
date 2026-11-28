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
    <div className="flex w-full flex-col items-stretch sm:w-auto sm:items-start">
      <button
        className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-[#cfd5c9] bg-white px-4 text-sm font-medium text-[#32372e] transition-colors duration-180 hover:border-[#d9a69c] hover:bg-[#fdf3f1] hover:text-[#a24132] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:cursor-wait disabled:opacity-70 sm:w-auto"
        type="button"
        onClick={() => void signOut()}
        disabled={pending}
      >
        {pending ? (
          <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
        ) : (
          <LogOut size={16} aria-hidden="true" />
        )}
        {pending ? t("auth.signingOut") : t("auth.signOut")}
      </button>
      {error && (
        <p className="mt-2 text-xs leading-normal text-[#a24132]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
