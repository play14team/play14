"use client"

import Logo from "@/components/layout/logo"
import Avatar from "@/components/ui/avatar"
import type { StrapiUser } from "@/libs/auth"
import { useTheme } from "next-themes"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface AdminSidebarProps {
  user: StrapiUser
}

interface NavItem {
  href: string
  icon: string
  label: string
  exact?: boolean
  founderOnly?: boolean
  organizerOnly?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

export default function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isFounder = user.player?.position === "Founder"
  const isMentor = user.player?.position === "Mentor"
  const isHost = user.player?.position === "Host"
  const isOrganizer = isHost || isMentor || isFounder

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  const navSections: NavSection[] = [
    {
      title: "General",
      items: [
        {
          href: "/admin",
          icon: "bx-grid-alt",
          label: "Dashboard",
          exact: true,
        },
        {
          href: "/admin/profile",
          icon: "bx-user",
          label: "My Profile",
        },
      ],
    },
    {
      title: "Management",
      items: [
        {
          href: "/admin/events",
          icon: "bx-calendar",
          label: "Events",
        },
        {
          href: "/admin/locations",
          icon: "bx-map-alt",
          label: "Locations",
          organizerOnly: true,
        },
        {
          href: "/admin/venues",
          icon: "bx-building-house",
          label: "Venues",
          organizerOnly: true,
        },
        {
          href: "/admin/sponsors",
          icon: "bx-diamond",
          label: "Sponsors",
          organizerOnly: true,
        },
        {
          href: "/admin/players",
          icon: "bx-group",
          label: "Players",
          organizerOnly: true,
        },
        {
          href: "/admin/orders",
          icon: "bx-receipt",
          label: "Orders",
        },
        {
          href: "/admin/tickets",
          icon: "bx-barcode",
          label: "Tickets",
        },
      ],
    },
    {
      title: "Claims",
      items: [
        {
          href: "/admin/attendance-claims",
          icon: "bx-calendar-check",
          label: "Attendance Claims",
          organizerOnly: true,
        },
        {
          href: "/admin/claims",
          icon: "bx-user-check",
          label: "Player Claims",
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
    <aside className={`admin-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="admin-sidebar-header">
        {!collapsed && (
          <Link href="/" className="admin-sidebar-logo">
            <Logo width={120} height={40} />
          </Link>
        )}
        <button
          type="button"
          className="admin-sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <i className={`bx ${collapsed ? "bx-chevron-right" : "bx-chevron-left"}`} />
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

      <nav className="admin-sidebar-nav">
        {visibleSections.map((section) => (
          <div key={section.title} className="admin-sidebar-section">
            {!collapsed && <h3 className="admin-sidebar-section-title">{section.title}</h3>}
            <ul>
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`admin-sidebar-link ${isActive(item.href, item.exact) ? "active" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <i className={`bx ${item.icon}`} />
                    {!collapsed && <span>{item.label}</span>}
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
              ? `Switch to ${mounted && resolvedTheme === "dark" ? "light" : "dark"} mode`
              : undefined
          }
          aria-label={`Switch to ${mounted && resolvedTheme === "dark" ? "light" : "dark"} mode`}
        >
          <i className={`bx ${mounted && resolvedTheme === "dark" ? "bx-sun" : "bx-moon"}`} />
          {!collapsed && (
            <span>{mounted && resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          )}
        </button>
        <Link
          href="/"
          className="admin-sidebar-link"
          title={collapsed ? "Back to Site" : undefined}
        >
          <i className="bx bx-home" />
          {!collapsed && <span>Back to Site</span>}
        </Link>
        <button
          type="button"
          className="admin-sidebar-link admin-sidebar-signout"
          onClick={handleSignOut}
          title={collapsed ? "Sign Out" : undefined}
        >
          <i className="bx bx-log-out" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
