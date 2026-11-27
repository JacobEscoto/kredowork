'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_LOCALE, LOCALES, resources, type Locale } from '@/lib/translations'
import { t } from '@/lib/translations'

type LanguageContextValue = {
  lang: Locale
  setLang: (next: Locale) => void
  translate: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.includes(value as Locale)
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const stored = localStorage.getItem('kw-lang')
    const next: Locale = isLocale(stored) ? stored : DEFAULT_LOCALE
    setLangState(next)
    document.documentElement.lang = next
  }, [])

  function setLang(next: Locale) {
    setLangState(next)
    localStorage.setItem('kw-lang', next)
    document.documentElement.lang = next
  }

  function translate(key: string, params?: Record<string, string | number>) {
    return t(lang, key, params)
  }

  const value: LanguageContextValue = { lang, setLang, translate }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return ctx
}

export { type Locale, DEFAULT_LOCALE }
