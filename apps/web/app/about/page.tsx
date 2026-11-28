"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Clock,
  Scale,
  Gavel,
} from "lucide-react";
import Brand from "@/components/brand";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useTranslation } from "@/components/language-provider";

export default function AboutPage() {
  const { translate: t } = useTranslation();

  const steps = [
    { title: t("about.step1Title"), body: t("about.step1Body") },
    { title: t("about.step2Title"), body: t("about.step2Body") },
    { title: t("about.step3Title"), body: t("about.step3Body") },
  ];

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
      <section className="max-w-270 pt-[clamp(58px,8vw,104px)] pb-16.5 border-b border-line max-[760px]:pt-12.5 max-[760px]:pb-10.5">
        <h1 className="m-0 max-w-225 text-[#171a15] text-[clamp(48px,7vw,82px)] leading-none tracking-[-0.065em] font-semibold max-[760px]:text-[clamp(46px,9vw,62px)] max-[760px]:tracking-[-0.055em]">
          {t("about.clearerWay")}
          <br />
          {t("about.toBuild")}{" "}
          <span className="text-[#69b94c]">{t("about.together")}</span>
        </h1>
        <p className="max-w-155 mt-6.5 text-[#646a60] text-[14px] leading-[1.8]">
          {t("about.intro")}
        </p>
      </section>
      <ol className="relative grid grid-cols-3 m-0 pb-17 border-b border-line list-none before:absolute before:top-4.25 before:left-4.25 before:right-[calc(33.333%-17px)] before:h-px before:bg-[#dfe4da] before:content-[''] max-[760px]:grid-cols-1 max-[760px]:pb-12 max-[760px]:before:right-auto max-[760px]:before:bottom-4.25 max-[760px]:before:w-px max-[760px]:before:h-auto">
        {steps.map(({ title, body }, index) => (
          <li
            className="relative flex min-w-0 flex-col items-start pr-7 max-[760px]:grid max-[760px]:grid-cols-[35px_minmax(0,1fr)] max-[760px]:gap-x-4.5 max-[760px]:pb-6.5 max-[760px]:pr-0 max-[760px]:last:pb-0"
            key={title}
          >
            <span
              className="z-1 grid w-8.75 h-8.75 place-items-center border border-lime rounded-full bg-white text-[#548f3c] text-[10px] font-bold"
              aria-hidden="true"
            >
              0{index + 1}
            </span>
            <div className="max-w-75 pt-4.25 max-[760px]:pt-px">
              <h2 className="m-0 text-[#171a15] text-[15px] leading-[1.35] tracking-[-0.25px]">
                {title}
              </h2>
              <p className="mt-2 text-[#70756b] text-[11px] leading-[1.7]">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <section
        className="grid grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] gap-[clamp(32px,6vw,84px)] py-17 border-b border-line max-[900px]:grid-cols-1 max-[900px]:gap-7.5 max-[900px]:py-13.5 max-[760px]:py-12"
        aria-label={t("about.guaranteesKicker")}
      >
        <div className="max-[900px]:max-w-155">
          <span className="flex items-center gap-2.5 mb-3.5 text-[#697063] text-[11px]">
            {t("about.guaranteesKicker")}
          </span>
          <h2 className="max-w-95 m-0 text-[clamp(27px,3vw,36px)] leading-[1.12] tracking-[-1.4px] max-[560px]:text-[28px]">
            {t("about.guaranteesTitle")}
          </h2>
          <p className="max-w-90 mt-3.75 text-[#676c63] text-xs leading-[1.75]">
            {t("about.guaranteesSubtitle")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-7 max-[560px]:grid-cols-1 max-[560px]:gap-x-0">
          {[
            {
              icon: ShieldCheck,
              title: t("about.guarantee1Title"),
              body: t("about.guarantee1Body"),
            },
            {
              icon: Clock,
              title: t("about.guarantee2Title"),
              body: t("about.guarantee2Body"),
            },
            {
              icon: Scale,
              title: t("about.guarantee3Title"),
              body: t("about.guarantee3Body"),
            },
            {
              icon: Gavel,
              title: t("about.guarantee4Title"),
              body: t("about.guarantee4Body"),
            },
          ].map(({ icon: Icon, title, body }) => (
            <article
              className="grid grid-cols-[34px_minmax(0,1fr)] gap-x-3 content-start py-4 border-t border-line"
              key={title}
            >
              <div className="row-span-2 grid place-items-center w-8 h-8 bg-[#f0f5ec] text-[#609847]">
                <Icon size={17} />
              </div>
              <h3 className="mt-0.5 mb-1.25 text-xs leading-[1.45]">{title}</h3>
              <p className="col-start-2 m-0 text-[#70756b] text-[10px] leading-[1.65]">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section
        className="grid grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] gap-[clamp(32px,6vw,84px)] py-17 border-b border-line max-[900px]:grid-cols-1 max-[900px]:gap-7.5 max-[900px]:py-13.5 max-[760px]:py-12"
        aria-label={t("about.flowKicker")}
      >
        <div className="max-[900px]:max-w-155">
          <span className="flex items-center gap-2.5 mb-3.5 text-[#697063] text-[11px]">
            {t("about.flowKicker")}
          </span>
          <h2 className="max-w-95 m-0 text-[clamp(27px,3vw,36px)] leading-[1.12] tracking-[-1.4px] max-[560px]:text-[28px]">
            {t("about.flowTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-x-7 max-[560px]:grid-cols-1 max-[560px]:gap-x-0">
          {[
            t("about.flowItem1"),
            t("about.flowItem2"),
            t("about.flowItem3"),
            t("about.flowItem4"),
          ].map((item, index) => (
            <article
              className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 min-h-18.5 py-4 border-t border-line"
              key={item}
            >
              <span className="text-[10px] tabular-nums text-[#609847]">
                0{index + 1}
              </span>
              <div>
                <p className="m-0 text-[#41463d] text-[11px] leading-[1.7]">
                  {item}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="flex items-center justify-between gap-6.25 py-8 border-b border-line max-[760px]:items-start max-[760px]:flex-col">
        <div>
          <span className="text-[#82877d] text-[9px] tracking-[0.04em]">
            {t("about.calloutLabel")}
          </span>
          <h2 className="max-w-125 mt-2 mb-0 text-[23px] leading-tight tracking-[-0.8px] max-[760px]:text-[21px] max-[560px]:text-[21px]">
            {t("about.calloutTitle1")}
            <br />
            {t("about.calloutTitle2")}
          </h2>
        </div>
        <Link
          className="inline-flex items-center justify-center gap-3 no-underline min-h-11.5 px-4.5 rounded-md bg-[#171a15] text-white text-xs whitespace-nowrap transition-colors duration-180 hover:bg-[#30372c]"
          href="/register"
        >
          {t("home.createAccount")} <ArrowRight size={16} />
        </Link>
      </section>
      <footer className="flex items-center justify-between gap-5 py-4.5 text-[#777c73] text-[10px] max-[760px]:flex-wrap max-[760px]:gap-3 [&>span:nth-child(2)]:max-[760px]:order-3 [&>span:nth-child(2)]:max-[760px]:w-full">
        <Brand compact variant="footer" />
        <span>{t("common.openCoordination")}</span>
        <span className="m-0 max-[460px]:w-full">
          {t("common.builtOnSolana")}{" "}
          <span className="px-0.75 text-[#a6aca0]">·</span> Devnet
        </span>
      </footer>
    </main>
  );
}
