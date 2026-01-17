"use client"

export const TAB_IDS = ["players", "imports", "invite"] as const
export type TabId = (typeof TAB_IDS)[number]

interface Tab {
  id: TabId
  label: string
  icon: string
}

const TABS: Tab[] = [
  { id: "players", label: "Players", icon: "bx-group" },
  { id: "imports", label: "Imports", icon: "bx-upload" },
  { id: "invite", label: "Single Invite", icon: "bx-envelope" },
]

interface PlayersTabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export default function PlayersTabs({ activeTab, onTabChange }: PlayersTabsProps) {
  return (
    <div className="events-page-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`events-page-tab ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          <i className={`bx ${tab.icon}`}></i>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
