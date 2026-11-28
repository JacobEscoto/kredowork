"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "./language-provider";
import type { Locale } from "@/lib/translations";

const LANGUAGE_OPTIONS: { value: Locale; labelKey: string }[] = [
  { value: "en", labelKey: "languages.english" },
  { value: "es", labelKey: "languages.spanish" },
];

export function LanguageDropdown() {
  const { lang, setLang, translate } = useTranslation();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        open &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        close();
      }
    }
    function handleKeydown(event: KeyboardEvent) {
      if (open && event.key === "Escape") close();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [open, close]);

  return (
    <div
      className="relative inline-flex items-center z-20"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        ref={buttonRef}
        className="inline-flex items-center gap-1.5 py-1.5 px-2.5 border border-line bg-white text-foreground text-[11px] rounded-md cursor-pointer transition-colors duration-180 hover:border-[#c5d0be] hover:bg-soft focus-visible:outline-2 focus-visible:outline-lime focus-visible:outline-offset-2"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={translate("common.changeLanguage")}
      >
        <Globe size={13} className="text-[#74776f]" aria-hidden="true" />
        <span className="font-semibold tracking-[0.04em] uppercase">
          {lang.toUpperCase()}
        </span>
        <ChevronDown
          size={11}
          className="text-[#74776f]"
          aria-hidden="true"
        />
      </button>
      {open && (
        <ul
          ref={menuRef}
          role="listbox"
          aria-label={translate("common.changeLanguage")}
          className="absolute top-[calc(100%+7px)] right-0 min-w-[150px] p-1.5 border border-line bg-white shadow-[0_10px_30px_#11130f18] rounded-lg z-30 flex flex-col"
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const active = lang === option.value;
            return (
              <li key={option.value}>
                <button
                  role="menuitemradio"
                  aria-checked={active}
                  className={cn(
                    "w-full flex items-center justify-between py-2 px-2.5 border-0 bg-transparent text-foreground text-[11px] cursor-pointer text-left rounded-sm hover:bg-soft",
                    active && "text-[#69b94c] font-bold bg-[#f0fdf4]",
                  )}
                  onClick={() => {
                    setLang(option.value);
                    close();
                  }}
                >
                  {translate(option.labelKey)}
                  {active && (
                    <Check
                      size={13}
                      className="text-[#69b94c]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
