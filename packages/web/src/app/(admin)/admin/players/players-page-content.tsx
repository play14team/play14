"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import ImportsForm from "../imports/imports-form"
import PlayersList from "./players-list"
import PlayersTabs, { TAB_IDS, type TabId } from "./players-tabs"
import SingleInviteForm from "./single-invite-form"

export default function PlayersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const getInitialTab = (): TabId => {
    const tabParam = searchParams.get("tab") as TabId | null
    if (tabParam && TAB_IDS.includes(tabParam)) {
      return tabParam
    }
    return "players"
  }

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab)

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab)
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", tab)
      router.replace(`/admin/players?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabId | null
    if (tabParam && TAB_IDS.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [searchParams, activeTab])

  return (
    <div className="events-page-layout has-sidebar">
      <div className="events-page-main">
        <PlayersTabs activeTab={activeTab} onTabChange={handleTabChange} />

        <div className="events-page-tab-content">
          {activeTab === "players" && <PlayersList />}
          {activeTab === "imports" && <ImportsForm />}
          {activeTab === "invite" && (
            <SingleInviteForm preSelectedPlayerId={searchParams.get("playerId")} />
          )}
        </div>
      </div>

      <div className="events-page-sidebar">
        <div className="events-sidebar-content">
          <div className="events-sidebar-section">
            <h3>Quick Links</h3>
            <Link
              href="/players"
              className="admin-btn admin-btn-secondary admin-btn-block"
              target="_blank"
            >
              <i className="bx bx-link-external" />
              View Public Directory
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
