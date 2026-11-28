"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";

type BrandVariant = "default" | "footer";

type BrandProps = {
  compact?: boolean;
  variant?: BrandVariant;
  href?: string;
};

export default function Brand({
  compact = false,
  variant = "default",
  href = "/",
}: BrandProps) {
  const { translate: t } = useTranslation();
  const isFooter = variant === "footer";
  return (
    <Link
      className={
        compact
          ? "inline-flex items-center gap-2.5 text-[#11130f] no-underline font-bold text-[15px] tracking-[-0.8px] whitespace-nowrap"
          : "inline-flex items-center gap-2.5 text-[#11130f] no-underline font-bold text-[18px] tracking-[-0.8px] whitespace-nowrap max-[460px]:text-[16px]"
      }
      href={href}
      aria-label={t("common.brandHome")}
    >
      <img
        src={isFooter ? "/icon-black-and-white.svg" : "/icon.svg"}
        alt=""
        width={compact ? 18 : 21}
        height={compact ? 18 : 21}
        className="shrink-0 block"
        aria-hidden="true"
      />
      <span>
        Kredo<span className="font-normal">Work</span>
      </span>
    </Link>
  );
}
