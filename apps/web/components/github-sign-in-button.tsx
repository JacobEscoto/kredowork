"use client";

import { useState } from "react";
import { siGithub } from "simple-icons";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "@/components/language-provider";
import { supabaseBrowser } from "@/lib/supabase/client";

export async function signInWithGitHub(nextPath = "/bounties") {
  const origin = window.location.origin;
  const redirectUrl = new URL(
    process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
      `${origin}/auth/callback`,
  );
  redirectUrl.searchParams.set("next", nextPath);
  const redirectTo = redirectUrl.toString();

  const { error } = await supabaseBrowser.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo,
      scopes: "read:user user:email",
    },
  });

  if (error) {
    throw error;
  }
}

export default function GitHubSignInButton() {
  const { translate: t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleSignIn() {
    setIsLoading(true);
    setHasError(false);

    try {
      await signInWithGitHub();
    } catch {
      setHasError(true);
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        className="register-method social-method github-active github-auth-action"
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        aria-busy={isLoading}
      >
        <span className="method-icon github-icon" aria-hidden="true">
          {isLoading ? (
            <LoaderCircle className="github-spinner" />
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d={siGithub.path} />
            </svg>
          )}
        </span>
        <span className="method-copy">
          <strong>
            {isLoading
              ? t("register.connectingGitHub")
              : t("register.continueGitHub")}
          </strong>
          <span>{t("register.githubSub")}</span>
        </span>
      </button>
      {hasError && (
        <p className="github-auth-error" role="alert">
          {t("auth.githubSignInFailed")}
        </p>
      )}
    </>
  );
}
