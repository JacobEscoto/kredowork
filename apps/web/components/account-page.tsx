"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import SignOutButton from "@/components/sign-out-button";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useTranslation } from "@/components/language-provider";

function Brand() {
  const { translate: t } = useTranslation();
  return (
    <Link className="brand" href="/" aria-label={t("common.brandHome")}>
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span>
        Kredo<span className="brand-light">Work</span>
      </span>
    </Link>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { translate: t } = useTranslation();
  const [user, setUser] = useState<{
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseBrowser.auth
      .getUser()
      .then(({ data }) => {
        const u = data.user;
        const meta = u?.user_metadata ?? {};
        setUser(
          u
            ? {
                name:
                  (meta.full_name as string | undefined) ??
                  (meta.user_name as string | undefined) ??
                  null,
                email: u.email ?? null,
                avatarUrl: (meta.avatar_url as string | undefined) ?? null,
              }
            : null,
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/register");
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <main className="kw-app auth-page">
      <header className="topbar auth-topbar">
        <Brand />
        <div className="top-actions">
          <Link className="auth-back" href="/">
            <ArrowLeft size={14} /> {t("common.backHome")}
          </Link>
          <LanguageDropdown />
        </div>
      </header>
      <section className="account-layout">
        <p className="landing-kicker">
          <span /> {t("account.kicker")}
        </p>
        <h1>
          {t("account.welcome")}
          <br />
          {t("account.toKredoWork")}
        </h1>
        <p className="account-lede">{t("account.lede")}</p>
        <div className="account-card">
          <span
            className="method-icon account-provider-icon"
            aria-hidden="true"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
                className="rounded-full"
              />
            ) : (
              "GH"
            )}
          </span>
          <span className="account-identity">
            <strong>{user.name || t("account.githubAccount")}</strong>
            <span>{user.email}</span>
          </span>
          <span className="account-status">
            <span /> {t("account.active")}
          </span>
        </div>
        <div className="account-actions">
          <SignOutButton />
          <Link className="primary-cta" href="/">
            {t("account.goToKredoWork")}
          </Link>
        </div>
      </section>
      <footer className="auth-footer">
        <Brand />
        <span>{t("common.builtForMaintainers")}</span>
      </footer>
    </main>
  );
}
