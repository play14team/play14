"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { useMobileSidebar } from "./mobile-sidebar-context"

const localeLabels: Record<string, string> = {
  en: "EN",
  fr: "FR",
  es: "ES",
}

const pageTitleKeys: Record<string, string> = {
  "/admin": "mobileHeader.dashboard",
  "/admin/profile": "mobileHeader.myProfile",
  "/admin/events": "mobileHeader.events",
  "/admin/events/create": "mobileHeader.createEvent",
  "/admin/locations": "mobileHeader.locations",
  "/admin/locations/create": "mobileHeader.createLocation",
  "/admin/venues": "mobileHeader.venues",
  "/admin/venues/create": "mobileHeader.createVenue",
  "/admin/sponsors": "mobileHeader.sponsors",
  "/admin/players": "mobileHeader.players",
  "/admin/likes": "mobileHeader.thingsWeLike",
  "/admin/orders": "mobileHeader.orders",
  "/admin/tickets": "mobileHeader.tickets",
  "/admin/newsletter": "mobileHeader.newsletter",
  "/admin/attendance-claims": "mobileHeader.attendanceClaims",
  "/admin/claims": "mobileHeader.playerClaims",
}

function getPageTitleKey(pathname: string): string {
  // Exact match first
  if (pageTitleKeys[pathname]) return pageTitleKeys[pathname]
  // Try prefix match (for dynamic routes like /admin/events/[slug])
  const segments = pathname.split("/")
  while (segments.length > 2) {
    segments.pop()
    const prefix = segments.join("/")
    if (pageTitleKeys[prefix]) return pageTitleKeys[prefix]
  }
  return "mobileHeader.admin"
}

export default function AdminMobileHeader() {
  const { open, isOpen, triggerRef } = useMobileSidebar()
  const pathname = usePathname()
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("admin")
  const titleKey = getPageTitleKey(pathname)
  const title = t(titleKey)
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false)
  const localeMenuRef = useRef<HTMLDivElement>(null)

  const handleLocaleChange = (newLocale: string) => {
    // Strip locale prefix from pathname if present
    const pathnameWithoutLocale = pathname.replace(/^\/(en|fr|es)/, "") || "/"
    router.replace(pathnameWithoutLocale as any, { locale: newLocale })
    setLocaleMenuOpen(false)
  }

  // Close locale menu on outside click
  useEffect(() => {
    if (!localeMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (localeMenuRef.current && !localeMenuRef.current.contains(e.target as Node)) {
        setLocaleMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [localeMenuOpen])

  // Close locale menu on Escape
  useEffect(() => {
    if (!localeMenuOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLocaleMenuOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [localeMenuOpen])

  return (
    <div className="admin-mobile-header">
      <button
        ref={triggerRef}
        type="button"
        className="admin-mobile-toggle"
        onClick={open}
        aria-label={t("mobileHeader.openMenu")}
        aria-expanded={isOpen}
      >
        <i className="bx bx-menu" />
      </button>
      <span className="admin-mobile-title">{title}</span>
      <div className="admin-mobile-actions">
        <div ref={localeMenuRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="admin-mobile-action"
            onClick={() => setLocaleMenuOpen(!localeMenuOpen)}
            aria-label={`${t("sidebar.language")}: ${localeLabels[locale]}`}
            aria-expanded={localeMenuOpen}
            aria-haspopup="listbox"
          >
            {localeLabels[locale]}
          </button>
          {localeMenuOpen && (
            <ul className="admin-locale-menu" role="listbox" aria-label={t("sidebar.language")}>
              {routing.locales.map((l) => (
                <li key={l} role="option">
                  <button
                    type="button"
                    onClick={() => handleLocaleChange(l)}
                    aria-selected={l === locale}
                  >
                    {localeLabels[l] ?? l.toUpperCase()}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link href="/" className="admin-mobile-home" aria-label={t("mobileHeader.backToSite")}>
          <i className="bx bx-home" />
        </Link>
      </div>
    </div>
  )
}
