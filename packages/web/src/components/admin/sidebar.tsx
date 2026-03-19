"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"
import Logo from "@/components/layout/logo"
import Avatar from "@/components/ui/avatar"
import { usePathname as useI18nPathname, useRouter as useI18nRouter } from "@/i18n/navigation"
import { localeLabels, routing } from "@/i18n/routing"
import type { StrapiUser } from "@/libs/auth"
import { useMobileSidebar } from "./mobile-sidebar-context"

interface AdminSidebarProps {
  user: StrapiUser
}

interface NavItem {
  href: string
  icon: string
  labelKey: string
  exact?: boolean
  founderOnly?: boolean
  organizerOnly?: boolean
}

interface NavSection {
  titleKey: string
  items: NavItem[]
}

export default function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = useI18nPathname()
  const router = useRouter()
  const locale = useLocale()
  const i18nRouter = useI18nRouter()
  const t = useTranslations("admin")
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const { isOpen: mobileOpen, close: closeMobileSidebar } = useMobileSidebar()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const localeMenuRef = useRef<HTMLDivElement>(null)

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const savedCollapsed = localStorage.getItem("admin-sidebar-collapsed")
    if (savedCollapsed !== null) {
      setCollapsed(savedCollapsed === "true")
    }
  }, [])

  // Persist collapsed state to localStorage
  const toggleCollapsed = () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    localStorage.setItem("admin-sidebar-collapsed", String(newCollapsed))
  }

  // Move focus to close button when sidebar opens on mobile
  useEffect(() => {
    if (mobileOpen) {
      // Small delay to allow the transition to start
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus()
      })
    }
  }, [mobileOpen])

  const isFounder = user.player?.position === "Founder"
  const isMentor = user.player?.position === "Mentor"
  const isHost = user.player?.position === "Host"
  const isOrganizer = isHost || isMentor || isFounder

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  const handleLocaleChange = (newLocale: string) => {
    i18nRouter.replace(pathname, { locale: newLocale })
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

  const navSections: NavSection[] = [
    {
      titleKey: "sidebar.sections.general",
      items: [
        {
          href: "/admin",
          icon: "bx-grid-alt",
          labelKey: "sidebar.dashboard",
          exact: true,
        },
        {
          href: "/admin/profile",
          icon: "bx-user",
          labelKey: "sidebar.myProfile",
        },
      ],
    },
    {
      titleKey: "sidebar.sections.management",
      items: [
        {
          href: "/admin/events",
          icon: "bx-calendar",
          labelKey: "sidebar.events",
        },
        {
          href: "/admin/locations",
          icon: "bx-map-alt",
          labelKey: "sidebar.locations",
          organizerOnly: true,
        },
        {
          href: "/admin/venues",
          icon: "bx-building-house",
          labelKey: "sidebar.venues",
          organizerOnly: true,
        },
        {
          href: "/admin/sponsors",
          icon: "bx-diamond",
          labelKey: "sidebar.sponsors",
          organizerOnly: true,
        },
        {
          href: "/admin/players",
          icon: "bx-group",
          labelKey: "sidebar.players",
          organizerOnly: true,
        },
        {
          href: "/admin/likes",
          icon: "bx-heart",
          labelKey: "sidebar.thingsWeLike",
          founderOnly: true,
        },
        {
          href: "/admin/orders",
          icon: "bx-receipt",
          labelKey: "sidebar.orders",
        },
        {
          href: "/admin/tickets",
          icon: "bx-barcode",
          labelKey: "sidebar.tickets",
        },
      ],
    },
    {
      titleKey: "sidebar.sections.communication",
      items: [
        {
          href: "/admin/newsletter",
          icon: "bx-envelope",
          labelKey: "sidebar.newsletter",
          founderOnly: true,
        },
      ],
    },
    {
      titleKey: "sidebar.sections.claims",
      items: [
        {
          href: "/admin/attendance-claims",
          icon: "bx-calendar-check",
          labelKey: "sidebar.attendanceClaims",
          organizerOnly: true,
        },
        {
          href: "/admin/claims",
          icon: "bx-user-check",
          labelKey: "sidebar.playerClaims",
          founderOnly: true,
        },
      ],
    },
  ]

  // Filter sections and items based on user role
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.founderOnly && !isFounder) return false
        if (item.organizerOnly && !isOrganizer) return false
        return true
      }),
    }))
    .filter((section) => section.items.length > 0)

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Backdrop overlay for mobile (always rendered, visibility controlled by CSS) */}
      <div
        className={`admin-sidebar-backdrop ${mobileOpen ? "visible" : ""}`}
        onClick={closeMobileSidebar}
        aria-hidden="true"
      />

      <aside
        className={`admin-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}
      >
        <div className="admin-sidebar-header">
          {!collapsed && (
            <Link href="/" className="admin-sidebar-logo">
              <Logo width={120} height={40} />
            </Link>
          )}
          <button
            type="button"
            className="admin-sidebar-toggle admin-sidebar-collapse-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? t("sidebar.expandSidebar") : t("sidebar.collapseSidebar")}
          >
            <i className={`bx ${collapsed ? "bx-chevron-right" : "bx-chevron-left"}`} />
          </button>
          <button
            ref={closeButtonRef}
            type="button"
            className="admin-sidebar-toggle admin-sidebar-close-toggle"
            onClick={closeMobileSidebar}
            aria-label={t("sidebar.closeMenu")}
          >
            <i className="bx bx-x" />
          </button>
        </div>

        <div className="admin-sidebar-user">
          <Avatar
            src={user.player?.avatar?.url}
            alt={user.username}
            fallback={user.username}
            size={collapsed ? "sm" : "md"}
          />
          {!collapsed && (
            <div className="admin-sidebar-user-info">
              <span className="admin-sidebar-user-name">{user.player?.name || user.username}</span>
              <span className="admin-sidebar-user-email">{user.email}</span>
            </div>
          )}
        </div>

        <nav className="admin-sidebar-nav" aria-label={t("sidebar.ariaLabel")}>
          {visibleSections.map((section) => (
            <div key={section.titleKey} className="admin-sidebar-section">
              {!collapsed && <h3 className="admin-sidebar-section-title">{t(section.titleKey)}</h3>}
              <ul>
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`admin-sidebar-link ${isActive(item.href, item.exact) ? "active" : ""}`}
                      title={collapsed ? t(item.labelKey) : undefined}
                    >
                      <i className={`bx ${item.icon}`} />
                      {!collapsed && <span>{t(item.labelKey)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-sidebar-link"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            title={
              collapsed
                ? mounted && resolvedTheme === "dark"
                  ? t("sidebar.lightMode")
                  : t("sidebar.darkMode")
                : undefined
            }
            aria-label={
              mounted && resolvedTheme === "dark" ? t("sidebar.lightMode") : t("sidebar.darkMode")
            }
          >
            <i className={`bx ${mounted && resolvedTheme === "dark" ? "bx-sun" : "bx-moon"}`} />
            {!collapsed && (
              <span>
                {mounted && resolvedTheme === "dark"
                  ? t("sidebar.lightMode")
                  : t("sidebar.darkMode")}
              </span>
            )}
          </button>
          <div ref={localeMenuRef} className="admin-locale-wrapper">
            <button
              type="button"
              className="admin-sidebar-link"
              onClick={() => setLocaleMenuOpen(!localeMenuOpen)}
              title={collapsed ? localeLabels[locale] : undefined}
              aria-label={`${t("sidebar.language")}: ${localeLabels[locale]}`}
              aria-expanded={localeMenuOpen}
              aria-haspopup="listbox"
            >
              <i className="bx bx-globe" />
              {!collapsed && <span>{localeLabels[locale]}</span>}
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
          <Link
            href="/"
            className="admin-sidebar-link"
            title={collapsed ? t("sidebar.backToSite") : undefined}
          >
            <i className="bx bx-home" />
            {!collapsed && <span>{t("sidebar.backToSite")}</span>}
          </Link>
          <button
            type="button"
            className="admin-sidebar-link admin-sidebar-signout"
            onClick={handleSignOut}
            title={collapsed ? t("sidebar.signOut") : undefined}
          >
            <i className="bx bx-log-out" />
            {!collapsed && <span>{t("sidebar.signOut")}</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
