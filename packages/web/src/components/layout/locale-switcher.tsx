"use client"

import { useLocale } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "@/i18n/navigation"
import { localeLabels, localeShortLabels, routing } from "@/i18n/routing"

export default function LocaleSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open])

  function buildHref(targetLocale: string) {
    if (targetLocale === routing.defaultLocale) return pathname
    return `/${targetLocale}${pathname}`
  }

  return (
    <div ref={ref} className="locale-switcher">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="theme-toggle"
        aria-label="Change language"
        aria-expanded={open}
        aria-haspopup="listbox"
        type="button"
      >
        <span className="locale-switcher-current">
          {localeShortLabels[locale] ?? locale.toUpperCase()}
        </span>
      </button>
      {open && (
        <ul className="locale-switcher-dropdown" role="listbox" aria-label="Language">
          {routing.locales.map((l) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <a
                href={buildHref(l)}
                className={`locale-switcher-option${l === locale ? " active" : ""}`}
                onClick={() => {
                  globalThis.cookieStore?.set({
                    name: "NEXT_LOCALE",
                    value: l,
                    path: "/",
                    expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
                  })
                  setOpen(false)
                }}
              >
                {localeLabels[l] ?? l.toUpperCase()}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
