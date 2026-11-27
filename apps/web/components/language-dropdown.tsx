'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Globe, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from './language-provider'
import type { Locale } from '@/lib/translations'

const LANGUAGE_OPTIONS: { value: Locale; labelKey: string }[] = [
  { value: 'en', labelKey: 'languages.english' },
  { value: 'es', labelKey: 'languages.spanish' },
]

export function LanguageDropdown() {
  const { lang, setLang, translate } = useTranslation()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)

  const close = useCallback(() => setOpen(false), [])

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
        close()
      }
    }
    function handleKeydown(event: KeyboardEvent) {
      if (open && event.key === 'Escape') close()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeydown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [open, close])

  return (
    <div className="language-dropdown" onClick={(event) => event.stopPropagation()}>
      <button
        ref={buttonRef}
        className="language-button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={translate('common.changeLanguage')}
      >
        <Globe size={13} className="language-icon" aria-hidden="true" />
        <span className="language-label">{lang.toUpperCase()}</span>
        <ChevronDown size={11} className="language-chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={menuRef}
          role="listbox"
          aria-label={translate('common.changeLanguage')}
          className="language-menu"
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const active = lang === option.value
            return (
              <li key={option.value}>
                <button
                  role="menuitemradio"
                  aria-checked={active}
                  className={cn('language-item', active && 'language-item-active')}
                  onClick={() => {
                    setLang(option.value)
                    close()
                  }}
                >
                  {translate(option.labelKey)}
                  {active && <Check size={13} className="language-check" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
