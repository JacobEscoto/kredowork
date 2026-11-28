"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Coins,
  Copy,
  Inbox,
  KeyRound,
  Lock,
  Menu,
  Search,
  SearchX,
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

const statusPill: Record<Status, string> = {
  OPEN: "bg-[#eef8e9] text-[#3f6f2a]",
  CLAIMED: "bg-[#fbf3e0] text-[#8a6218]",
  SUBMITTED: "bg-[#e9f0f9] text-[#3d628f]",
  PRE_APPROVED: "bg-[#f1ebf8] text-[#6c4a9a]",
  COMPLETED: "bg-[#e8f3e8] text-[#3b7339]",
  EXPIRED: "bg-[#f1f1ef] text-[#6b7066]",
  DISPUTED: "bg-[#fbece9] text-[#a24132]",
  REJECTED: "bg-[#f8e3df] text-[#8c2f22]",
};

// Mismo grid para encabezado y filas (solo desde lg)
const ROW_GRID =
  "lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,1fr)_1.5rem]";

function shortHash(hash: string) {
  if (hash.includes("…") || hash.length <= 14) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

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
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(hash);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-360 flex-col px-4 sm:px-6 md:px-8 lg:px-[6.25%]">
      {/* Header */}
      <header className="relative flex h-16 items-center gap-6 border-b border-line lg:h-19.5 lg:gap-14">
        <Brand />
        <nav
          className="hidden h-full items-center gap-6 md:flex lg:gap-8"
          aria-label={t("common.navAria")}
        >
          <Link
            href="/bounties"
            className="relative flex h-full items-center text-sm font-semibold text-[#161812] no-underline after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-lime after:content-['']"
          >
            {t("nav.bounties")}
          </Link>
          <Link
            href="/about"
            className="flex h-full items-center text-sm text-[#5f645b] no-underline transition-colors hover:text-[#161812]"
          >
            {t("nav.about")}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-4 lg:gap-5.5">
          <span className="hidden items-center gap-2 text-xs text-[#555a52] md:flex">
            <span
              aria-hidden="true"
              className="size-1.75 rounded-full bg-lime shadow-[0_0_0_3px_#77cc5a22]"
            />
            {t("common.solanaDevnet")}
          </span>
          <AuthNav />
          <LanguageDropdown />
          <button
            type="button"
            onClick={() => setMobileNav((open) => !open)}
            aria-expanded={mobileNav}
            aria-label={
              mobileNav ? t("common.closeMenu") : t("common.openMenu")
            }
            className="grid size-11 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-[#171a15] hover:bg-[#f1f3ee] focus-visible:outline-2 focus-visible:outline-lime md:hidden"
          >
            {mobileNav ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileNav && (
          <nav
            className="absolute inset-x-0 top-full z-20 flex flex-col border-b border-line bg-white px-1 py-2 shadow-[0_16px_30px_#11130f10] md:hidden"
            aria-label={t("common.navAria")}
          >
            <Link
              href="/bounties"
              onClick={() => setMobileNav(false)}
              className="flex min-h-12 items-center border-l-2 border-lime px-3 text-sm font-semibold text-[#161812] no-underline"
            >
              {t("nav.bounties")}
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileNav(false)}
              className="flex min-h-12 items-center border-l-2 border-transparent px-3 text-sm text-[#5f645b] no-underline hover:bg-[#f7f8f5]"
            >
              {t("nav.about")}
            </Link>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section
        id="top"
        className="flex flex-col gap-8 border-b border-line py-10 sm:py-14 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:py-16"
      >
        <div className="max-w-147.5">
          <h1 className="m-0 text-[clamp(2.5rem,7vw,3.875rem)] font-semibold leading-[1.04] tracking-[-0.06em] text-[#171a15]">
            {t("home.workOpen")}
            <br />
            {t("home.deserves")}{" "}
            <span className="text-[#4f9a36]">{t("home.rewards")}</span>
            <span className="text-lime">.</span>
          </h1>
          <p className="mb-6 mt-4 max-w-117.5 text-sm leading-7 text-[#5f645b] sm:text-[15px]">
            {t("bounties.title")}
          </p>
          <a
            href="#bounties"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-lime px-5 text-sm font-semibold text-[#171a15] no-underline transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171a15] sm:w-auto"
          >
            {t("home.bottomOpenTasks")}
            <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>

        <ul
          aria-label={t("bounties.proofAria")}
          className="m-0 flex list-none flex-col gap-3 p-0 lg:w-72 lg:pb-1"
        >
          {[
            { icon: ShieldCheck, text: t("bounties.proofOpen") },
            { icon: KeyRound, text: t("bounties.proofNoMasterKey") },
            { icon: Lock, text: t("bounties.proofEscrow") },
          ].map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-3 text-[13px] text-[#41463d]"
            >
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-md bg-[#eaf3e4] text-[#3f7a2a]"
              >
                <Icon size={16} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      {/* Marketplace */}
      <section id="bounties" className="flex-1 py-10 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 className="m-0 text-[clamp(1.6rem,4vw,1.8rem)] font-semibold tracking-[-0.04em] text-[#171a15]">
            {t("bounties.title")}
            <span className="text-lime">.</span>
          </h2>
          <div className="flex items-center gap-2 text-xs text-[#6b7066]">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-lime shadow-[0_0_0_3px_#77cc5a22]"
            />
            {t("bounties.updated")}
          </div>
        </div>

        {/* Buscador + filtros */}
        <div className="mt-6">
          <label className="relative flex w-full items-center text-[#6b7066] focus-within:text-[#171a15]">
            <Search
              size={20}
              aria-hidden="true"
              className="pointer-events-none absolute left-4"
            />
            <span className="sr-only">{t("bounties.searchAria")}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("bounties.searchPlaceholder")}
              className="h-13 w-full rounded-lg border border-[#cfd5c9] bg-white pl-12 pr-12 text-base text-[#171a15] placeholder:text-[#8a8e85] focus:border-[#171a15] focus:outline-none focus:ring-4 focus:ring-lime/30 sm:h-14 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 grid size-10 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-[#6b7066] hover:bg-[#f1f3ee] hover:text-[#171a15] focus-visible:outline-2 focus-visible:outline-lime"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </label>

          <div className="mt-5 border-b border-line">
            <div
              role="tablist"
              aria-label={t("bounties.filterLabel")}
              className="-mx-4 flex gap-5 overflow-x-auto px-4 scrollbar-none sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
            >
              {statuses.map((status) => {
                const isSelected = active === status;
                const count = totalByStatus(status);
                return (
                  <button
                    key={status}
                    role="tab"
                    type="button"
                    aria-selected={isSelected}
                    onClick={() => setActive(status)}
                    className={`-mb-px inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-0 border-b-2 bg-transparent px-0.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-lime ${
                      isSelected
                        ? "border-lime font-semibold text-[#171a15]"
                        : "border-transparent text-[#5f645b] hover:text-[#171a15]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-1.5 rounded-full ${statusDotColors[status]}`}
                    />
                    {statusLabel(status)}
                    {count > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-px text-[11px] tabular-nums ${
                          isSelected
                            ? "bg-[#eaf3e4] text-[#3f6f2a]"
                            : "bg-[#f1f3ee] text-[#6b7066]"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {/* Encabezado de columnas (solo escritorio) */}
        <div
          aria-hidden="true"
          className={`hidden gap-4 px-4 pb-3 pt-4 text-xs font-medium text-[#6b7066] lg:grid ${ROW_GRID}`}
        >
          <span>{t("bounties.listHeadTask")}</span>
          <span>{t("bounties.listHeadEscrow")}</span>
          <span>{t("bounties.listHeadDeadline")}</span>
          <span>{t("bounties.listHeadApproval")}</span>
          <span>{t("bounties.listHeadSpec")}</span>
          <span />
        </div>

        {/* Lista */}
        <div
          role="tabpanel"
          aria-label={`Bounties ${statusLabel(active).toLowerCase()}`}
          className="border-t border-line"
        >
          {filtered.length ? (
            filtered.map((bounty) => (
              <article
                key={bounty.id}
                className={`group relative grid grid-cols-1 gap-4 border-b border-line px-1 py-5 transition-colors hover:bg-[#fbfcfa] sm:px-2 lg:items-center lg:px-4 ${ROW_GRID}`}
              >
                {/* Tarea */}
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-md bg-[#eaf3e4] text-xs font-bold text-[#3f7a2a]"
                  >
                    {bounty.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPill[bounty.status]}`}
                      >
                        <i
                          aria-hidden="true"
                          className={`size-1.5 rounded-full ${statusDotColors[bounty.status]}`}
                        />
                        {statusLabel(bounty.status)}
                      </span>
                      <span className="truncate font-mono text-xs text-[#6b7066]">
                        {bounty.id}
                      </span>
                    </div>
                    <h3 className="m-0 mt-2 text-base font-semibold leading-snug tracking-[-0.01em] text-[#171a15]">
                      <Link
                        href={`/bounties/${encodeURIComponent(bounty.id)}`}
                        aria-label={t("bounties.viewBounty", {
                          title: bounty.title,
                        })}
                        className="no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-lime"
                      >
                        {bounty.title}
                      </Link>
                    </h3>
                    <p className="mb-2 mt-1.5 line-clamp-2 max-w-130 text-[13px] leading-6 text-[#5f645b]">
                      {bounty.summary}
                    </p>
                    <span className="text-xs text-[#555a52]">
                      {bounty.space}
                    </span>
                  </div>
                </div>

                {/* Datos: 2 col (móvil), 4 col (sm), columnas del grid (lg) */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 lg:contents">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#6b7066] lg:hidden">
                      <Coins size={14} aria-hidden="true" />
                      {t("bounties.listHeadEscrow")}
                    </span>
                    <strong className="whitespace-nowrap text-sm font-semibold text-[#171a15]">
                      {bounty.amount.toLocaleString()}{" "}
                      <span className="text-xs font-normal text-[#6b7066]">
                        SOL
                      </span>
                    </strong>
                    <small className="flex items-center gap-1 text-xs text-[#6b7066]">
                      <Lock size={11} aria-hidden="true" />
                      {t("bounties.vaultLocked")}
                    </small>
                  </div>

                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#6b7066] lg:hidden">
                      <Clock3 size={14} aria-hidden="true" />
                      {t("bounties.listHeadDeadline")}
                    </span>
                    <strong className="whitespace-nowrap text-sm font-semibold text-[#171a15]">
                      {bounty.deadline}
                    </strong>
                    <small
                      className={`text-xs ${
                        bounty.days > 0 && bounty.days <= 2
                          ? "font-medium text-[#a8601a]"
                          : "text-[#6b7066]"
                      }`}
                    >
                      {bounty.days
                        ? t("bounties.daysRemaining", { days: bounty.days })
                        : t("bounties.finished")}
                    </small>
                  </div>

                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#6b7066] lg:hidden">
                      <ShieldCheck size={14} aria-hidden="true" />
                      {t("bounties.listHeadApproval")}
                    </span>
                    <span className="text-[13px] text-[#41463d]">
                      {bounty.approval}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-col items-start gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#6b7066] lg:hidden">
                      <Copy size={14} aria-hidden="true" />
                      {t("bounties.listHeadSpec")}
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyHash(bounty.hash)}
                      aria-label={t("bounties.copyHash", {
                        hash: shortHash(bounty.hash),
                      })}
                      className="relative z-10 -ml-2 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-2 text-[#5f645b] transition-colors hover:bg-[#eaf3e4] hover:text-[#2f5d1c] focus-visible:outline-2 focus-visible:outline-lime"
                    >
                      {copied === bounty.hash ? (
                        <Check size={14} aria-hidden="true" />
                      ) : (
                        <Copy size={14} aria-hidden="true" />
                      )}
                      <code className="font-mono text-xs">
                        {shortHash(bounty.hash)}
                      </code>
                    </button>
                  </div>
                </div>

                <ArrowUpRight
                  size={18}
                  aria-hidden="true"
                  className="hidden text-[#a3a79f] transition-colors group-hover:text-[#171a15] lg:block"
                />
              </article>
            ))
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center gap-1 border-b border-line px-4 py-10 text-center">
              <span
                aria-hidden="true"
                className="grid size-11 place-items-center rounded-md bg-[#eaf3e4] text-[#3f7a2a]"
              >
                {query ? <SearchX size={20} /> : <Inbox size={20} />}
              </span>
              <h3 className="mb-0 mt-3 text-base font-semibold text-[#171a15]">
                {query
                  ? t("bounties.emptyTitleQuery")
                  : t("bounties.emptyNone", {
                      status: statusLabel(active).toLowerCase(),
                    })}
              </h3>
              <p className="m-0 max-w-90 text-[13px] leading-6 text-[#5f645b]">
                {query
                  ? t("bounties.emptySubQuery")
                  : active === "DISPUTED"
                    ? t("bounties.emptyDisputed")
                    : t("bounties.emptyDefault")}
              </p>
              {!query && (
                <button
                  type="button"
                  onClick={() => setActive("OPEN")}
                  className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-[#cfd5c9] bg-white px-4 text-xs font-medium text-[#171a15] transition-colors hover:border-[#171a15] hover:bg-[#f1f3ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                >
                  {t("home.bottomOpenTasks")}
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 py-4 text-xs text-[#6b7066] sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t("bounties.showing", {
              from: filtered.length,
              to: totalByStatus(active),
            })}
          </span>
          <button
            type="button"
            onClick={() => setActive("OPEN")}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#cfd5c9] bg-white px-4 text-xs font-medium text-[#171a15] transition-colors hover:border-[#171a15] hover:bg-[#f1f3ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime sm:justify-start"
          >
            {t("bounties.viewAllTasks")}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="how-it-works"
        className="flex flex-col items-start gap-3 border-t border-line py-5 text-xs text-[#6b7066] md:flex-row md:items-center md:gap-5"
      >
        <Brand compact variant="footer" href="#top" />
        <span>{t("common.openCoordination")}</span>
        <span className="md:ml-auto">{t("bounties.footerBuilt")}</span>
      </footer>
    </main>
  );
}
