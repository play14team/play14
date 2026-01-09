"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import EventsTabs, { type TabId, TAB_IDS } from "./events-tabs"
import OrganizedTab from "./tabs/organized-tab"
import AttendedTab from "./tabs/attended-tab"
import ClaimsTab from "./tabs/claims-tab"
import type { StrapiUser } from "@/libs/auth"

interface EventsPageContentProps {
  user: StrapiUser
}

export default function EventsPageContent({ user }: EventsPageContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Determine user role
  const position = user.player?.position
  const isOrganizer =
    position === "Host" || position === "Mentor" || position === "Founder"

  // Get initial tab from URL or default based on role
  const getInitialTab = (): TabId => {
    const tabParam = searchParams.get("tab") as TabId | null
    if (tabParam && TAB_IDS.includes(tabParam)) {
      // Validate that non-organizers can't access organized tab
      if (tabParam === "organized" && !isOrganizer) {
        return "attended"
      }
      return tabParam
    }
    // Default: organizers see organized first, players see attended
    return isOrganizer ? "organized" : "attended"
  }

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab)
  const [counts, setCounts] = useState<{
    organized?: number
    attended?: number
    pendingClaims?: number
  }>({})

  // Update URL when tab changes
  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab)
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", tab)
      router.replace(`/admin/events?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  // Sync tab with URL on mount and URL changes
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabId | null
    if (tabParam && TAB_IDS.includes(tabParam)) {
      // Validate that non-organizers can't access organized tab
      if (tabParam === "organized" && !isOrganizer) {
        handleTabChange("attended")
      } else if (tabParam !== activeTab) {
        setActiveTab(tabParam)
      }
    }
  }, [searchParams, isOrganizer, activeTab, handleTabChange])

  // Callbacks for count updates
  const handleOrganizedCountChange = useCallback((count: number) => {
    setCounts((prev) => ({ ...prev, organized: count }))
  }, [])

  const handleAttendedCountChange = useCallback((count: number) => {
    setCounts((prev) => ({ ...prev, attended: count }))
  }, [])

  const handlePendingClaimsCountChange = useCallback((count: number) => {
    setCounts((prev) => ({ ...prev, pendingClaims: count }))
  }, [])

  return (
    <div className={`events-page-layout ${isOrganizer ? "has-sidebar" : ""}`}>
      {/* Main Content Area */}
      <div className="events-page-main">
        {/* Tab Navigation */}
        <EventsTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isOrganizer={isOrganizer}
          counts={counts}
        />

        {/* Tab Content */}
        <div className="events-page-tab-content">
          {activeTab === "organized" && isOrganizer && (
            <OrganizedTab onCountChange={handleOrganizedCountChange} />
          )}

          {activeTab === "attended" && (
            <AttendedTab onCountChange={handleAttendedCountChange} />
          )}

          {activeTab === "claims" && (
            <ClaimsTab onPendingCountChange={handlePendingClaimsCountChange} />
          )}
        </div>
      </div>

      {/* Sticky Sidebar for Organizers */}
      {isOrganizer && (
        <div className="events-page-sidebar">
          <div className="events-sidebar-content">
            <div className="events-sidebar-section">
              <h3>Quick Actions</h3>
              <Link
                href="/admin/events/create"
                className="admin-btn admin-btn-primary admin-btn-block"
              >
                <i className="bx bx-plus"></i>
                Create Event
              </Link>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
