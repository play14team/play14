"use client"

import { useTranslations } from "next-intl"

export const TAB_IDS = ["players", "imports", "invite"] as const
export type TabId = (typeof TAB_IDS)[number]

interface Tab {
  id: TabId
  labelKey: string
  icon: string
}

const TABS: Tab[] = [
  { id: "players", labelKey: "tabs.players", icon: "bx-group" },
  { id: "imports", labelKey: "tabs.imports", icon: "bx-upload" },
  { id: "invite", labelKey: "tabs.invite", icon: "bx-envelope" },
]

interface PlayersTabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export default function PlayersTabs({ activeTab, onTabChange }: PlayersTabsProps) {
  const t = useTranslations("adminMisc.players")

  return (
    <div className="events-page-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`events-page-tab ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          <i className={`bx ${tab.icon}`} />
          <span>{t(tab.labelKey)}</span>
        </button>
      ))}
    </div>
  )
}
