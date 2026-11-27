import { en } from "./en";
import { es } from "./es";
import type { Locale, Translations } from "./types";

export type { Locale };

export const LOCALES: Locale[] = ["en", "es"];
export const DEFAULT_LOCALE: Locale = "es";

export const resources: Record<Locale, Translations> = { en, es };

/**
 * Resolve a translation string by dot-separated path.
 * Replaces {{param}} placeholders when params are provided.
 * Falls back to the key itself when missing (keeps UI from breaking).
 */
export function t(
  lang: Locale,
  key: string,
  params: Record<string, string | number> = {},
): string {
  let cursor: unknown = resources[lang];
  for (const part of key.split(".")) {
    if (!cursor || typeof cursor !== "object") return key;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  let text = typeof cursor === "string" ? cursor : key;
  return text.replace(/\{\{(\w+)\}\}/g, (_match, name) =>
    String(params[name] ?? ""),
  );
}
