"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck } from "lucide-react";
import AuthNav from "@/components/auth-nav";
import Brand from "@/components/brand";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useTranslation } from "@/components/language-provider";
import { createClient } from "@/lib/supabase/client";

interface HomePageProps {
  isAuthenticated?: boolean;
}

export default function HomePage({ isAuthenticated = false }: HomePageProps) {
  const { translate: t } = useTranslation();
  const [loggedIn, setLoggedIn] = useState(isAuthenticated);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(Boolean(user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session?.user));
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <main className="min-h-screen max-w-[1440px] mx-auto px-[6.25%] flex flex-col max-[1050px]:px-[4%] max-[760px]:px-[22px] max-[460px]:px-[17px]">
      <header className="h-[78px] flex items-center border-b border-line gap-0 max-[760px]:h-[66px]">
        <Brand />
        <nav
          className="flex items-center gap-[30px] ml-[72px] max-[1050px]:ml-[42px] max-[1050px]:gap-5 max-[760px]:hidden [&_a]:text-[#64695f] [&_a]:no-underline [&_a]:text-xs [&_a:hover]:text-[#171a15]"
          aria-label={t("common.navAria")}
        >
          <Link href="/about">{t("nav.about")}</Link>
          <Link href="/bounties">{t("nav.bounties")}</Link>
        </nav>
        <div className="ml-auto flex items-center gap-[22px] max-[760px]:gap-2.5 max-[460px]:gap-0">
          <span className="text-[11px] text-[#555a52] flex items-center gap-2 max-[760px]:hidden">
            <span className="w-[7px] h-[7px] rounded-full bg-lime shadow-[0_0_0_3px_#77cc5a22]" />{" "}
            {t("common.solanaDevnet")}
          </span>
          <AuthNav />
          <LanguageDropdown />
        </div>
      </header>

      <section className="min-h-[555px] grid grid-cols-[minmax(0,1.1fr)_minmax(350px,0.9fr)] items-center gap-[50px] pt-[42px] pb-[58px] border-b border-line max-[1050px]:gap-7 max-[840px]:grid-cols-1 max-[840px]:gap-8 max-[840px]:pt-[50px] max-[840px]:pb-[34px]">
        <div className="max-w-[610px]">
          <h1 className="m-0 text-[#171a15] text-[clamp(48px,6.2vw,78px)] leading-[0.99] tracking-[-5.5px] font-semibold max-[1050px]:text-[clamp(50px,6vw,68px)] max-[840px]:text-[clamp(48px,10vw,68px)] max-[840px]:tracking-[-3.7px] max-[460px]:text-[44px] max-[460px]:tracking-[-2.8px]">
            {t("home.workOpen")}
            <br />
            {t("home.deserves")}{" "}
            <span className="text-[#69b94c]">{t("home.rewards")}</span>
          </h1>
          <p className="max-w-[490px] mt-[26px] text-[#63685f] text-[14px] leading-[1.85] max-[840px]:text-[13px]">
            {t("home.lede")}
          </p>
          <div className="flex items-center gap-[23px] mt-8 max-[460px]:items-start max-[460px]:flex-col max-[460px]:gap-[18px]">
            <Link
              className="inline-flex items-center justify-center gap-3 no-underline min-h-[46px] px-[18px] bg-[#171a15] text-white text-xs transition-colors duration-180 hover:bg-[#30372c] rounded-md"
              href={loggedIn ? "/bounties" : "/register"}
            >
              {loggedIn ? t("nav.bounties") : t("home.createAccount")}{" "}
              <ArrowRight size={16} />
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-3 no-underline text-[#262a22] text-xs hover:text-[#508f38] rounded-md"
              href="/about"
            >
              {t("home.learnMore")} <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="flex items-center gap-2 mt-[23px] text-[#858a80] text-[10px]">
            <ShieldCheck size={15} className="text-[#75ba59]" />
            <span>{t("home.devnetTrust")}</span>
          </div>
        </div>
        <div className="flex flex-col gap-4 text-[#63685f] text-[13px] leading-[1.7] max-[840px]:text-[12px]">
          <p>{t("home.workDefined")}</p>
          <p>{t("home.fundsEscrowed")}</p>
          <p>{t("home.communityReviewed")}</p>
        </div>
      </section>
      <footer className="mt-auto border-t border-line flex items-center justify-between gap-5 py-[18px] text-[#777c73] text-[10px] max-[760px]:flex-wrap max-[760px]:gap-3 max-[460px]:items-start max-[460px]:gap-3.5">
        <Brand compact variant="footer" />
        <nav
          className="flex items-center gap-[clamp(16px,3vw,28px)] ml-auto max-[460px]:w-full max-[460px]:ml-[27px] max-[460px]:gap-5 [&_a]:text-[#71766e] [&_a]:no-underline [&_a]:text-[10px] [&_a:hover]:text-[#171a15]"
          aria-label={t("common.footerNavAria")}
        >
          <Link href="/about">{t("nav.about")}</Link>
          <Link href="/bounties">{t("nav.bounties")}</Link>
        </nav>
      </footer>
    </main>
  );
}
