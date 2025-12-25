"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import Avatar from "@/components/ui/avatar"
import Logo from "@/components/layout/logo"
import type { StrapiUser } from "@/libs/auth"

interface AdminSidebarProps {
  user: StrapiUser
}

interface NavItem {
  href: string
  icon: string
  label: string
  exact?: boolean
  founderOnly?: boolean
}

export default function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const isFounder = user.player?.position === "Founder"

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  const navItems: NavItem[] = [
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
    {
      href: "/admin/claims",
      icon: "bx-user-check",
      label: "Claims",
      founderOnly: true,
    },
    // Future items
    // { href: "/admin/events", icon: "bx-calendar", label: "Events" },
    // { href: "/admin/players", icon: "bx-group", label: "Players" },
  ]

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(
    (item) => !item.founderOnly || isFounder
  )

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
          <i className={`bx ${collapsed ? "bx-chevron-right" : "bx-chevron-left"}`}></i>
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
        <ul>
          {visibleNavItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`admin-sidebar-link ${isActive(item.href, item.exact) ? "active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <i className={`bx ${item.icon}`}></i>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="admin-sidebar-footer">
        <Link
          href="/"
          className="admin-sidebar-link"
          title={collapsed ? "Back to Site" : undefined}
        >
          <i className="bx bx-home"></i>
          {!collapsed && <span>Back to Site</span>}
        </Link>
        <button
          type="button"
          className="admin-sidebar-link admin-sidebar-signout"
          onClick={handleSignOut}
          title={collapsed ? "Sign Out" : undefined}
        >
          <i className="bx bx-log-out"></i>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
