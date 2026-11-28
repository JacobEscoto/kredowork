"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import AuthNav from "@/components/auth-nav";
import Brand from "@/components/brand";
import { LanguageDropdown } from "@/components/language-dropdown";
import { useTranslation } from "@/components/language-provider";
import type { MarketplaceBounty, MarketplaceStatus } from "@/lib/marketplace";

type Status = MarketplaceStatus;
type Bounty = MarketplaceBounty;

const statuses: Status[] = [
  "OPEN",
  "CLAIMED",
  "SUBMITTED",
  "PRE_APPROVED",
  "COMPLETED",
  "EXPIRED",
  "DISPUTED",
  "REJECTED",
];
const statusDotColors: Record<Status, string> = {
  OPEN: "bg-[#71bb53]",
  CLAIMED: "bg-[#d9ac4d]",
  SUBMITTED: "bg-[#7398cb]",
  PRE_APPROVED: "bg-[#9a78c9]",
  COMPLETED: "bg-[#69aa68]",
  EXPIRED: "bg-[#aaa]",
  DISPUTED: "bg-[#d77462]",
  REJECTED: "bg-[#a24132]",
};
export default function BountyExplorer({ bounties }: { bounties: Bounty[] }) {
  const { translate: t } = useTranslation();
  const [active, setActive] = useState<Status>("OPEN");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const filtered = useMemo(
    () =>
      bounties.filter(
        (bounty) =>
          bounty.status === active &&
          `${bounty.title} ${bounty.summary} ${bounty.space}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [active, bounties, query],
  );

  const statusLabel = (status: Status) => t(`bounties.status.${status}`);
  const totalByStatus = (status: Status) =>
    bounties.filter((item) => item.status === status).length;

  async function copyHash(hash: string) {
    const fullHash = hash.replace("…", "000000000000000000000000000000000000");
    try {
      await navigator.clipboard.writeText(fullHash);
      setCopied(hash);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  return (
    <main className="min-h-screen max-w-[1440px] mx-auto px-[6.25%] max-[1050px]:px-[4%] max-[760px]:px-[22px] max-[460px]:px-[17px]">
      <header className="h-[78px] flex items-center border-b border-line gap-14 max-[1050px]:gap-9 max-[760px]:h-[66px] max-[760px]:gap-0">
        <Brand />
        <nav
          className={`h-full flex items-center gap-[34px] max-[1050px]:gap-[22px] max-[760px]:${mobileNav ? "flex flex-col" : "hidden"} max-[760px]:absolute max-[760px]:z-2 max-[760px]:top-[65px] max-[760px]:left-0 max-[760px]:right-0 max-[760px]:h-auto max-[760px]:bg-white max-[760px]:border-b max-[760px]:border-line max-[760px]:pt-2 max-[760px]:px-[22px] max-[760px]:pb-4 max-[760px]:items-stretch max-[760px]:gap-0`}
          aria-label={t("common.navAria")}
        >
          <a
            className="text-[13px] text-[#161812] font-semibold no-underline h-full flex items-center relative after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-lime max-[760px]:h-[42px] max-[760px]:after:right-auto max-[760px]:after:w-[42px]"
            href="/bounties"
          >
            {t("nav.bounties")}
          </a>
          <a
            className="text-[13px] text-[#74776f] no-underline h-full flex items-center relative max-[760px]:h-[42px]"
            href="/about"
          >
            {t("nav.about")}
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-[22px] max-[760px]:gap-3 max-[460px]:gap-0">
          <span className="text-[11px] text-[#555a52] flex items-center gap-2 max-[760px]:hidden">
            <span className="w-[7px] h-[7px] rounded-full bg-lime shadow-[0_0_0_3px_#77cc5a22]" />{" "}
            {t("common.solanaDevnet")}
          </span>
          <AuthNav />
          <LanguageDropdown />
        </div>
        <button
          className="hidden bg-transparent border-0 cursor-pointer max-[760px]:grid max-[760px]:place-items-center max-[760px]:ml-3 max-[760px]:p-[5px] [&_svg]:w-5 [&_svg]:h-5"
          onClick={() => setMobileNav(!mobileNav)}
          aria-label={mobileNav ? t("common.closeMenu") : t("common.openMenu")}
        >
          {mobileNav ? <X /> : <Menu />}
        </button>
      </header>

      <section
        className="relative min-h-[346px] pt-[61px] pb-[54px] flex items-center justify-between border-b border-line max-[760px]:min-h-auto max-[760px]:py-12 max-[760px]:items-start max-[760px]:gap-7 max-[460px]:block max-[460px]:pt-[41px] max-[460px]:pb-[47px]"
        id="top"
      >
        <div className="max-w-[590px] max-[460px]:max-w-full">
          <h1 className="m-0 text-[clamp(42px,5vw,62px)] font-semibold tracking-[-3.8px] leading-[1.04] max-[760px]:text-[clamp(38px,8vw,54px)] max-[760px]:tracking-[-2.7px] max-[460px]:text-[43px]">
            {t("home.workOpen")}
            <br />
            {t("home.deserves")}{" "}
            <span className="text-[#528d3a]">{t("home.rewards")}</span>
            <span className="text-lime">.</span>
          </h1>
          <p className="max-w-[470px] mt-[18px] mb-5 text-[#666a62] text-[14px] leading-[1.65] max-[760px]:text-[13px] max-[760px]:max-w-[430px]">
            {t("bounties.title")}
          </p>
          <a
            className="inline-flex items-center gap-2.5 text-[#242820] no-underline text-xs font-semibold pb-[5px] border-b border-lime [&_svg]:text-[#599842]"
            href="#bounties"
          >
            {t("home.bottomOpenTasks")} <ArrowRight size={16} />
          </a>
        </div>
        <aside
          className="relative w-[264px] min-h-[182px] border border-line pt-[18px] px-[19px] pb-[15px] mr-[42px] max-[1050px]:mr-7 max-[760px]:w-[210px] max-[760px]:flex-[0_0_210px] max-[760px]:mt-1.5 max-[760px]:mr-0 max-[760px]:p-[15px] max-[460px]:w-auto max-[460px]:min-h-0 max-[460px]:mt-7 max-[460px]:py-3.5 max-[460px]:px-4 max-[460px]:grid max-[460px]:grid-cols-2 max-[460px]:items-center"
          aria-label={t("bounties.proofAria")}
        >
          <div className="flex items-center gap-2 text-[11px] text-[#62665e] [&_svg]:text-[#548d3d] max-[460px]:col-span-full">
            <ShieldCheck size={19} />
            <span>{t("bounties.proofOpen")}</span>
            <span className="ml-auto w-[7px] h-[7px] bg-lime rounded-full" />
          </div>
          <div className="flex items-baseline gap-[9px] mt-[19px] max-[760px]:block max-[760px]:mt-[15px] max-[460px]:mt-3">
            <strong className="text-[34px] font-semibold tracking-[-2px] max-[760px]:text-[29px] max-[760px]:block">
              {bounties.length.toLocaleString()}
            </strong>
            <span className="text-[11px] text-[#777b73] max-[760px]:text-[10px]">
              {t("bounties.proofTasks")}
            </span>
          </div>
          <div className="h-px bg-line mt-[17px] mb-3 max-[460px]:hidden" />
          <div className="flex justify-between text-[10px] text-[#777b73] max-[760px]:gap-2 max-[760px]:flex-col max-[460px]:mt-3 max-[460px]:items-end">
            <span>{t("bounties.proofNoMasterKey")}</span>
            <span>{t("bounties.proofEscrow")}</span>
          </div>
          <div className="absolute right-[19px] -top-[9px] bg-white px-[5px] text-[#8a8e85] text-[9px] tracking-[0.08em] max-[460px]:top-auto max-[460px]:bottom-[11px] max-[460px]:right-4">
            KW / 01
          </div>
        </aside>
        <div
          className="absolute right-0 bottom-[18px] flex items-center gap-[9px] text-[#8b8f87] text-[9px] max-[760px]:bottom-3"
          aria-hidden="true"
        >
          <span className="text-[#30342d]">01</span>
          <span className="h-px w-[29px] bg-[#d5d8d2]" />
          <span>03</span>
        </div>
      </section>

      <section className="pt-12 pb-[42px] max-[760px]:pt-[37px]" id="bounties">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="m-0 font-semibold text-[29px] tracking-[-1.2px] [&_span]:text-lime max-[460px]:text-[26px]">
              {t("bounties.title")}
            </h2>
          </div>
          <div className="flex items-center gap-[9px] text-[#878b83] text-[10px] max-[460px]:text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full bg-lime shadow-[0_0_0_3px_#77cc5a22]" />
            <span>{t("bounties.updated")}</span>
            <a
              className="text-[#747970] ml-[5px] inline-flex"
              href="#bounties"
              aria-label={t("bounties.viewAllTasks")}
            >
              <ArrowDownRight size={17} />
            </a>
          </div>
        </div>
        <div className="flex justify-between items-center gap-5 mt-[31px] border-b border-line max-[760px]:items-start max-[760px]:flex-col-reverse max-[760px]:gap-[13px] max-[760px]:mt-6">
          <div
            className="flex gap-5 items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[1050px]:gap-3.5 max-[760px]:w-full max-[760px]:gap-[19px] max-[460px]:gap-[17px]"
            role="tablist"
            aria-label={t("bounties.filterLabel")}
          >
            {statuses.map((status) => {
              const isSelected = active === status;
              return (
                <button
                  key={status}
                  role="tab"
                  aria-selected={isSelected}
                  className={
                    isSelected
                      ? "relative pb-[13px] border-0 bg-transparent text-[#161812] font-semibold whitespace-nowrap cursor-pointer text-[11px] after:content-[''] after:h-[2px] after:absolute after:left-0 after:right-0 after:bottom-[-1px] after:bg-lime max-[760px]:pb-[11px] max-[460px]:text-[10px]"
                      : "relative pb-[13px] border-0 bg-transparent text-[#7c8078] whitespace-nowrap cursor-pointer text-[11px] max-[760px]:pb-[11px] max-[460px]:text-[10px]"
                  }
                  onClick={() => setActive(status)}
                >
                  {statusLabel(status)}
                  <span className="ml-[5px] text-[#9da198] text-[9px]">
                    {totalByStatus(status) || "—"}
                  </span>
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-[#82867e] pb-[11px] shrink-0 focus-within:text-[#508c38] max-[760px]:self-end max-[760px]:pb-0">
            <Search size={16} />
            <span className="sr-only">{t("bounties.searchAria")}</span>
            <input
              className="w-[116px] border-0 outline-0 text-[#20231d] text-[11px] bg-transparent placeholder:text-[#90948c] focus-visible:outline-2 focus-visible:outline-[#77cc5a77] focus-visible:outline-offset-4"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("bounties.searchPlaceholder")}
            />
          </label>
        </div>
        <div className="grid grid-cols-[minmax(340px,2.6fr)_1fr_1.15fr_1.1fr_1fr_26px] gap-4 pt-4 px-[13px] pb-[11px] text-[#989c94] uppercase tracking-[0.055em] text-[9px] [&>span:not(:first-child)]:pl-0.5 max-[1050px]:grid-cols-[minmax(290px,2.3fr)_0.8fr_1fr_1fr_0.8fr_20px] max-[1050px]:gap-2.5 max-[760px]:hidden">
          <span>{t("bounties.listHeadTask")}</span>
          <span>{t("bounties.listHeadEscrow")}</span>
          <span>{t("bounties.listHeadDeadline")}</span>
          <span>{t("bounties.listHeadApproval")}</span>
          <span>{t("bounties.listHeadSpec")}</span>
          <span aria-hidden="true" />
        </div>
        <div
          className="border-t border-[#e6e9e3]"
          role="tabpanel"
          aria-label={`Bounties ${statusLabel(active).toLowerCase()}`}
        >
          {filtered.length ? (
            filtered.map((bounty) => (
              <article
                className="grid grid-cols-[minmax(340px,2.6fr)_1fr_1.15fr_1.1fr_1fr_26px] gap-4 items-center py-4 px-[13px] border-b border-line min-h-[98px] transition-colors duration-160 hover:bg-[#fbfcfa] max-[1050px]:grid-cols-[minmax(290px,2.3fr)_0.8fr_1fr_1fr_0.8fr_20px] max-[1050px]:gap-2.5 max-[760px]:grid-cols-[minmax(0,1fr)_auto] max-[760px]:gap-[11px] max-[760px]:py-4 max-[760px]:px-[7px]"
                key={bounty.id}
              >
                <div className="flex items-start gap-3 min-w-0 max-[760px]:col-span-full max-[460px]:gap-2.5">
                  <div className="w-[30px] h-[30px] flex-[0_0_30px] grid place-items-center bg-[#f0f4ed] text-[#638351] text-[9px] font-bold tracking-[-0.2px] max-[460px]:w-[27px] max-[460px]:h-[27px] max-[460px]:basis-[27px]">
                    {bounty.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-[9px] flex-wrap max-[460px]:gap-[7px]">
                      <h3 className="m-0 font-semibold text-xs tracking-[-0.15px] max-[460px]:text-[11px]">
                        {bounty.title}
                      </h3>
                      <span className="inline-flex items-center gap-[5px] text-[#777b73] text-[9px] max-[460px]:text-[8px]">
                        <i
                          className={`w-1.5 h-1.5 rounded-full ${statusDotColors[bounty.status]}`}
                        />
                        {statusLabel(bounty.status)}
                      </span>
                    </div>
                    <p className="mt-[5px] mb-2 text-[#777b73] text-[10px] leading-[1.5] max-w-[420px] max-[1050px]:max-w-[330px] max-[760px]:max-w-full max-[460px]:text-[10px]">
                      {bounty.summary}
                    </p>
                    <span className="text-[9px] text-[#555a52]">
                      {bounty.space}
                      <span className="ml-[9px] text-[#a0a49c]">{bounty.id}</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 max-[760px]:col-start-1 max-[760px]:row-start-2 max-[760px]:gap-[3px]">
                  <strong className="text-[11px] font-semibold whitespace-nowrap">
                    {bounty.amount.toLocaleString()}{" "}
                    <span className="font-normal text-[#787d74] text-[10px]">
                      SOL
                    </span>
                  </strong>
                  <small className="text-[9px] text-[#969a92] whitespace-nowrap">
                    {t("bounties.vaultLocked")}
                  </small>
                </div>
                <div className="flex flex-col gap-1.5 max-[760px]:col-start-2 max-[760px]:row-start-2 max-[760px]:items-end max-[760px]:gap-[3px]">
                  <strong className="text-[11px] font-semibold whitespace-nowrap">
                    {bounty.deadline}
                  </strong>
                  <small
                    className={`text-[9px] whitespace-nowrap ${bounty.days <= 2 ? "text-[#ba7a38]" : "text-[#969a92]"}`}
                  >
                    {bounty.days
                      ? t("bounties.daysRemaining", { days: bounty.days })
                      : t("bounties.finished")}
                  </small>
                </div>
                <div className="flex items-center gap-[7px] text-[10px] text-[#555a52] whitespace-nowrap [&_svg]:text-[#9b9f97] max-[760px]:col-start-1 max-[760px]:row-start-3">
                  <span>{bounty.approval}</span>
                  <ChevronDown size={13} />
                </div>
                <button
                  className="justify-self-start flex items-center gap-[7px] border-0 py-[5px] px-0 bg-transparent text-[#6c7168] cursor-pointer hover:text-[#4e8b38] max-[760px]:col-start-2 max-[760px]:row-start-3 max-[760px]:justify-self-end"
                  onClick={() => copyHash(bounty.hash)}
                  aria-label={t("bounties.copyHash", { hash: bounty.hash })}
                >
                  {copied === bounty.hash ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                  <code className="font-mono text-[10px]">{bounty.hash}</code>
                </button>
                <Link
                  href={`/bounties/${encodeURIComponent(bounty.id)}`}
                  className="grid place-items-center text-[#a3a79f] p-[5px] hover:text-[#4f8e39] max-[760px]:hidden"
                  aria-label={t("bounties.viewBounty", { title: bounty.title })}
                >
                  <ExternalLink size={16} />
                </Link>
              </article>
            ))
          ) : (
            <div className="min-h-[220px] flex flex-col items-center justify-center text-center p-6 border-b border-line">
              <div className="w-[38px] h-[38px] grid place-items-center bg-[#f3f6f0]">
                <img
                  src="/icon.svg"
                  alt=""
                  width={17}
                  height={17}
                  className="shrink-0 block"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-[13px] mb-1.5 text-[14px] font-semibold">
                {query
                  ? t("bounties.emptyTitleQuery")
                  : t("bounties.emptyNone", {
                      status: statusLabel(active).toLowerCase(),
                    })}
              </h3>
              <p className="mb-[13px] text-[#7a7e76] text-[11px]">
                {query
                  ? t("bounties.emptySubQuery")
                  : active === "DISPUTED"
                    ? t("bounties.emptyDisputed")
                    : t("bounties.emptyDefault")}
              </p>
              {!query && (
                <button
                  className="flex items-center gap-2 bg-transparent border-0 text-[#3f7331] text-[10px] font-semibold cursor-pointer p-[7px]"
                  onClick={() => setActive("OPEN")}
                >
                  {t("home.bottomOpenTasks")} <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-between items-center py-4 px-[13px] text-[#969a92] text-[10px]">
          <span>
            {t("bounties.showing", {
              from: filtered.length,
              to: totalByStatus(active),
            })}
          </span>
          <button
            className="flex items-center gap-2 bg-transparent border-0 text-[#3f7331] text-[10px] font-semibold cursor-pointer"
            onClick={() => setActive("OPEN")}
          >
            {t("bounties.viewAllTasks")} <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <footer
        className="min-h-[73px] flex items-center gap-[22px] border-t border-line text-[10px] text-[#858980] max-[760px]:flex-wrap max-[760px]:gap-x-[17px] max-[760px]:gap-y-2.5 max-[760px]:py-[17px]"
        id="how-it-works"
      >
        <Brand compact variant="footer" href="#top" />
        <span>{t("common.openCoordination")}</span>
        <span className="ml-auto text-[#676c63] max-[760px]:ml-0 max-[760px]:w-full">
          {t("bounties.footerBuilt")}
        </span>
      </footer>
    </main>
  );
}
