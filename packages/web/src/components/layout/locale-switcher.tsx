"use client"

import { useLocale } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { Link, usePathname } from "@/i18n/navigation"
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
              <Link
                href={pathname}
                locale={l}
                className={`locale-switcher-option${l === locale ? " active" : ""}`}
                onClick={() => setOpen(false)}
              >
                {localeLabels[l] ?? l.toUpperCase()}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
