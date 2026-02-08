"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMobileSidebar } from "./mobile-sidebar-context"

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/profile": "My profile",
  "/admin/events": "Events",
  "/admin/events/create": "Create event",
  "/admin/locations": "Locations",
  "/admin/locations/create": "Create location",
  "/admin/venues": "Venues",
  "/admin/venues/create": "Create venue",
  "/admin/sponsors": "Sponsors",
  "/admin/players": "Players",
  "/admin/likes": "Things we like",
  "/admin/orders": "Orders",
  "/admin/tickets": "Tickets",
  "/admin/newsletter": "Newsletter",
  "/admin/attendance-claims": "Attendance claims",
  "/admin/claims": "Player claims",
}

function getPageTitle(pathname: string): string {
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname]
  // Try prefix match (for dynamic routes like /admin/events/[slug])
  const segments = pathname.split("/")
  while (segments.length > 2) {
    segments.pop()
    const prefix = segments.join("/")
    if (pageTitles[prefix]) return pageTitles[prefix]
  }
  return "Admin"
}

export default function AdminMobileHeader() {
  const { open, isOpen, triggerRef } = useMobileSidebar()
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <div className="admin-mobile-header">
      <button
        ref={triggerRef}
        type="button"
        className="admin-mobile-toggle"
        onClick={open}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
      >
        <i className="bx bx-menu" />
      </button>
      <span className="admin-mobile-title">{title}</span>
      <Link href="/" className="admin-mobile-home" aria-label="Back to site">
        <i className="bx bx-home" />
      </Link>
    </div>
  )
}
