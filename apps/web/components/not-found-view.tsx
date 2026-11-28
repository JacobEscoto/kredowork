"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Brand from "@/components/brand";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useTranslation } from "@/components/language-provider";

export default function NotFoundView() {
  const { translate: t } = useTranslation();

  return (
    <main className="min-h-screen max-w-360 mx-auto px-[6.25%] flex flex-col max-[1050px]:px-[4%] max-[760px]:px-5.5 max-[460px]:px-4.25">
      <header className="h-19.5 flex items-center justify-between border-b border-line max-[760px]:h-16.5">
        <Brand />
        <div className="ml-auto flex items-center gap-5.5 max-[760px]:gap-3 max-[460px]:gap-0">
          <Link
            className="inline-flex items-center gap-2 text-[#71766e] no-underline text-[11px] hover:text-[#171a15]"
            href="/"
          >
            <ArrowLeft size={14} /> {t("common.backHome")}
          </Link>
          <LanguageDropdown />
        </div>
      </header>

      <section className="flex flex-1 flex-col items-start justify-center w-full max-w-170 mx-auto py-18.5 max-[760px]:py-13">
        <div className="inline-flex items-center gap-2.5 mb-5 px-3 py-1.5 rounded-full border border-[#e6e9e3] bg-white text-[#5d6359] text-[10px] font-medium">
          <span>{t("notFound.code")}</span>
        </div>

        <h1 className="m-0 text-[#171a15] text-[clamp(48px,6.5vw,76px)] leading-[0.98] tracking-[-4px] font-semibold max-[460px]:text-[46px] max-[460px]:tracking-[-2.8px]">
          {t("notFound.titleLine1")}
          <br />
          {t("notFound.titleLine2")}
        </h1>

        <p className="mt-5 mb-8 max-w-115 text-[#676c63] text-[13px] leading-[1.75]">
          {t("notFound.description")}
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/bounties"
            className="inline-flex items-center justify-center gap-2 no-underline min-h-11 px-4.5 rounded-md bg-[#171a15] text-white text-xs font-medium transition-colors duration-180 hover:bg-[#30372c]"
          >
            {t("notFound.exploreTasks")}
            <ArrowUpRight size={14} />
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 no-underline min-h-11 px-4.5 rounded-md border border-line bg-white text-[#171a15] text-xs font-medium transition-colors duration-180 hover:bg-[#f6f8f4]"
          >
            <ArrowLeft size={14} />
            {t("notFound.backHome")}
          </Link>
        </div>
      </section>

      <footer className="flex items-center justify-between gap-5 py-4.25 border-t border-line text-[#858a80] text-[9px] max-[760px]:flex-wrap max-[760px]:[&>span]:w-full">
        <Brand compact variant="footer" />
        <span>{t("common.builtForMaintainers")}</span>
      </footer>
    </main>
  );
}
