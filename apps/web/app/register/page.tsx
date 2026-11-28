"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import WalletConnect from "@/components/wallet-connect";
import GitHubSignInButton from "@/components/github-sign-in-button";
import Brand from "@/components/brand";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useTranslation } from "@/components/language-provider";

type CallbackError =
  "auth.githubProfileUnavailable" | "auth.githubSignInFailed";

export default function RegisterPage() {
  const { translate: t } = useTranslation();
  const [callbackError, setCallbackError] = useState<CallbackError | null>(
    null,
  );

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const fragmentParams = new URLSearchParams(window.location.hash.slice(1));
    const errorDescription =
      fragmentParams.get("error_description")?.toLowerCase() ?? "";
    const hasAuthError =
      queryParams.has("error") || fragmentParams.has("error");

    if (!hasAuthError) return;

    const isProfileError =
      errorDescription.includes("profile") &&
      errorDescription.includes("external provider");

    setCallbackError(
      isProfileError
        ? "auth.githubProfileUnavailable"
        : "auth.githubSignInFailed",
    );
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-360 flex-col px-4 sm:px-6 md:px-8 lg:px-[6.25%]">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-line lg:h-19.5">
        <Brand />
        <div className="ml-auto flex items-center gap-2 sm:gap-4 lg:gap-5.5">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded px-1 text-xs text-[#5f645b] no-underline transition-colors hover:text-[#171a15] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171a15]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {/* En móvil muy chico queda solo el icono, pero accesible */}
            <span className="sr-only sm:not-sr-only">
              {t("common.backHome")}
            </span>
          </Link>
          <LanguageDropdown />
        </div>
      </header>

      {/* Contenido */}
      <section className="mx-auto grid w-full max-w-120 flex-1 grid-cols-1 content-center gap-8 py-10 md:gap-10 md:py-14 lg:max-w-237.5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:items-center lg:gap-16 lg:py-21 xl:gap-22.5">
        {/* Texto de bienvenida */}
        <div className="max-w-112.5">
          <h1 className="m-0 text-[clamp(2.5rem,9vw,3.875rem)] font-semibold leading-[1.02] tracking-[-0.06em] text-[#171a15]">
            {t("register.enter")}
            <br />
            {t("register.conversation")}
          </h1>
          <p className="mt-5 max-w-97.5 text-sm leading-7 text-[#676c63] lg:mt-6">
            {t("register.intro")}
          </p>
          <div className="mt-6 flex items-center gap-2.5 text-xs text-[#5f645b] lg:mt-7.75">
            <span
              aria-hidden="true"
              className="size-1.75 shrink-0 rounded-full bg-lime shadow-[0_0_0_3px_#77cc5a22]"
            />
            <span>{t("register.networkNote")}</span>
          </div>
        </div>

        {/* Tarjeta de registro */}
        <div className="w-full border border-[#e6e9e3] bg-white p-5 shadow-[0_16px_45px_#171a1508] sm:p-6 lg:p-7.5">
          <h2 className="m-0 text-xl tracking-[-0.035em]">
            {t("register.createAccount")}
          </h2>
          <p className="mb-5 mt-1.5 text-[13px] text-[#6b7066]">
            {t("register.chooseMethod")}
          </p>

          {callbackError && (
            <p
              role="alert"
              className="mb-4 rounded border border-[#a24132]/20 bg-[#a24132]/5 px-3 py-2 text-xs leading-normal text-[#a24132]"
            >
              {t(callbackError)}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <WalletConnect variant="method" />
            <GitHubSignInButton />
          </div>

          <p className="mt-4 text-xs leading-relaxed text-[#6b7066]">
            {t("register.oauthNote")}
          </p>
          <p className="mt-4 border-t border-[#edf0eb] pt-4 text-xs leading-relaxed text-[#6b7066]">
            {t("register.legal")}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-start gap-3 border-t border-line py-4 text-xs text-[#6b7066] sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <Brand compact variant="footer" />
        <span>{t("common.builtForMaintainers")}</span>
      </footer>
    </main>
  );
}
