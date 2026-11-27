"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { useTranslation } from "@/components/language-provider";
import { supabaseBrowser } from "@/lib/supabase/client";

type NavUser = { avatarUrl: string | null; name: string | null };

function toNavUser(
  user: {
    user_metadata?: Record<string, unknown>;
  } | null,
): NavUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const avatar = typeof meta.avatar_url === "string" ? meta.avatar_url : null;
  const name =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.user_name === "string"
        ? meta.user_name
        : null;
  return { avatarUrl: avatar, name };
}

export default function AuthNav() {
  const { translate: t } = useTranslation();
  const [user, setUser] = useState<NavUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    supabaseBrowser.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(toNavUser(data.user));
      setReady(true);
    });

    const { data: sub } = supabaseBrowser.auth.onAuthStateChange(
      (_event, session) => {
        setUser(toNavUser(session?.user ?? null));
        setReady(true);
      },
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Evita parpadeo del botón "Entrar" mientras se resuelve la sesión.
  if (!ready) return <span className="nav-profile-placeholder" aria-hidden />;

  if (!user) {
    return (
      <Link className="nav-auth-cta" href="/register">
        {t("nav.accountAccess")}
      </Link>
    );
  }

  return (
    <Link
      className="nav-profile"
      href="/account"
      aria-label={user.name ?? t("nav.profile")}
      title={user.name ?? t("nav.profile")}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          width={36}
          height={36}
        />
      ) : (
        <UserRound size={18} aria-hidden="true" />
      )}
    </Link>
  );
}
