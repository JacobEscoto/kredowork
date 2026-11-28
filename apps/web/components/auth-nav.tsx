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
  const walletAddr =
    typeof meta.wallet_address === "string" ? meta.wallet_address : null;
  const name =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.user_name === "string"
        ? meta.user_name
        : walletAddr
          ? `${walletAddr.slice(0, 4)}…${walletAddr.slice(-4)}`
          : null;
  return { avatarUrl: avatar, name };
}

export default function AuthNav() {
  const { translate: t } = useTranslation();
  const [user, setUser] = useState<NavUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(toNavUser(data.session?.user ?? null));
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

  if (!ready) {
    return (
      <span
        className="inline-block h-9 w-9 mx-2.5 rounded-full shrink-0"
        aria-hidden
      />
    );
  }

  if (!user) {
    return (
      <Link
        className="inline-flex items-center justify-center min-h-9 px-3 rounded-md border border-[#171a15] bg-[#171a15] text-white no-underline text-[11px] font-semibold whitespace-nowrap transition-colors duration-180 hover:border-[#30372c] hover:bg-[#30372c] focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-3 max-[760px]:min-h-8.5 max-[760px]:px-2.5 max-[760px]:text-[10px]"
        href="/register"
      >
        {t("nav.accountAccess")}
      </Link>
    );
  }

  return (
    <Link
      className="inline-flex items-center justify-center w-9 h-9 mx-2.5 rounded-full overflow-hidden border border-[#e6e9e3] bg-[#f8f9f7] text-[#3d4538] shrink-0 no-underline transition-all duration-180 hover:border-[#30372c] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-2"
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
          className="w-full h-full object-cover rounded-full block"
        />
      ) : (
        <UserRound size={18} aria-hidden="true" />
      )}
    </Link>
  );
}
