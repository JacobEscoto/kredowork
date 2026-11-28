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

  const guarantees = [
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
  ];

  const flowItems = [
    t("about.flowItem1"),
    t("about.flowItem2"),
    t("about.flowItem3"),
    t("about.flowItem4"),
  ];

  // Conector entre pasos: vertical en móvil, horizontal desde md.
  // Cada paso dibuja el suyo hacia el siguiente, así nunca se solapa
  // con los círculos ni sobrepasa el último paso.
  const connector =
    "after:absolute after:content-[''] after:bg-[#d3dacd] " +
    "after:left-4.25 after:top-11 after:bottom-2 after:w-px " +
    "md:after:left-11 md:after:right-2 md:after:top-4.25 md:after:bottom-auto md:after:h-px md:after:w-auto";

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
            <span className="sr-only sm:not-sr-only">
              {t("common.backHome")}
            </span>
          </Link>
          <LanguageDropdown />
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-270 border-b border-line pb-12 pt-[clamp(3rem,8vw,6.5rem)] md:pb-16">
        <h1 className="m-0 max-w-225 text-[clamp(2.5rem,8vw,5.125rem)] font-semibold leading-none tracking-[-0.06em] text-[#171a15]">
          {t("about.clearerWay")}
          <br />
          {t("about.toBuild")}{" "}
          <span className="text-[#4f9a36]">{t("about.together")}</span>
        </h1>
        <p className="mt-6 max-w-155 text-sm leading-7 text-[#5f645b] sm:text-[15px] md:mt-6.5">
          {t("about.intro")}
        </p>
      </section>

      {/* Timeline */}
      <ol className="m-0 grid list-none grid-cols-1 border-b border-line p-0 py-10 md:grid-cols-3 md:py-14">
        {steps.map(({ title, body }, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li
              key={title}
              className={`relative grid min-w-0 grid-cols-[35px_minmax(0,1fr)] gap-x-4 pb-8 last:pb-0 md:flex md:flex-col md:items-start md:pb-0 md:pr-7 ${
                isLast ? "" : connector
              }`}
            >
              <span
                aria-hidden="true"
                className="grid size-8.75 place-items-center rounded-full border border-lime bg-white text-xs font-bold text-[#3f7a2a]"
              >
                0{index + 1}
              </span>
              <div className="pt-1.5 md:max-w-75 md:pt-4.25">
                <h2 className="m-0 text-base leading-snug tracking-[-0.02em] text-[#171a15]">
                  {title}
                </h2>
                <p className="mt-2 text-[13px] leading-6 text-[#5f645b]">
                  {body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Garantías */}
      <section
        aria-label={t("about.guaranteesKicker")}
        className="grid grid-cols-1 gap-8 border-b border-line py-12 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] lg:gap-[clamp(2rem,6vw,5.25rem)] lg:py-17"
      >
        <div className="max-w-155">
          <span className="mb-3.5 flex items-center gap-2.5 text-xs text-[#5f645b]">
            {t("about.guaranteesKicker")}
          </span>
          <h2 className="m-0 max-w-95 text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.12] tracking-[-0.04em] text-[#171a15]">
            {t("about.guaranteesTitle")}
          </h2>
          <p className="mt-3.75 max-w-90 text-[13px] leading-6 text-[#5f645b]">
            {t("about.guaranteesSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-7 sm:grid-cols-2">
          {guarantees.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="grid grid-cols-[34px_minmax(0,1fr)] content-start gap-x-3 border-t border-line py-4"
            >
              <div
                aria-hidden="true"
                className="row-span-2 grid size-8.5 place-items-center bg-[#eaf3e4] text-[#3f7a2a]"
              >
                <Icon size={17} />
              </div>
              <h3 className="mb-1.25 mt-0.5 text-sm font-semibold leading-snug text-[#171a15]">
                {title}
              </h3>
              <p className="col-start-2 m-0 text-xs leading-relaxed text-[#5f645b]">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Flujo */}
      <section
        aria-label={t("about.flowKicker")}
        className="grid grid-cols-1 gap-8 border-b border-line py-12 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] lg:gap-[clamp(2rem,6vw,5.25rem)] lg:py-17"
      >
        <div className="max-w-155">
          <span className="mb-3.5 flex items-center gap-2.5 text-xs text-[#5f645b]">
            {t("about.flowKicker")}
          </span>
          <h2 className="m-0 max-w-95 text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.12] tracking-[-0.04em] text-[#171a15]">
            {t("about.flowTitle")}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-x-7 sm:grid-cols-2">
          {flowItems.map((item, index) => (
            <article
              key={item}
              className="grid min-h-18.5 grid-cols-[30px_minmax(0,1fr)] gap-3 border-t border-line py-4"
            >
              <span className="text-xs font-medium tabular-nums text-[#3f7a2a]">
                0{index + 1}
              </span>
              <p className="m-0 text-[13px] leading-6 text-[#41463d]">
                {item}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Callout */}
      <section className="flex flex-col items-stretch gap-5 border-b border-line py-8 md:flex-row md:items-center md:justify-between md:gap-6">
        <div>
          <span className="text-xs tracking-[0.04em] text-[#6b7066]">
            {t("about.calloutLabel")}
          </span>
          <h2 className="mb-0 mt-2 max-w-125 text-[clamp(1.3rem,3vw,1.5rem)] leading-tight tracking-[-0.03em] text-[#171a15]">
            {t("about.calloutTitle1")}
            <br />
            {t("about.calloutTitle2")}
          </h2>
        </div>
        <Link
          href="/register"
          className="inline-flex min-h-12 w-full items-center justify-center gap-3 whitespace-nowrap rounded-md bg-[#171a15] px-5 text-sm font-medium text-white no-underline transition-colors duration-180 hover:bg-[#30372c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime md:w-auto"
        >
          {t("home.createAccount")}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-start gap-3 py-5 text-xs text-[#6b7066] md:flex-row md:items-center md:justify-between md:gap-5">
        <Brand compact variant="footer" />
        <span>{t("common.openCoordination")}</span>
        <span className="m-0">
          {t("common.builtOnSolana")}{" "}
          <span aria-hidden="true" className="px-0.75 text-[#a6aca0]">
            ·
          </span>{" "}
          Devnet
        </span>
      </footer>
    </main>
  );
}
