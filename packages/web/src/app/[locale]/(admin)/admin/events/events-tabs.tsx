"use client"

import { useTranslations } from "next-intl"

export const TAB_IDS = ["organized", "attended", "claims"] as const
export type TabId = (typeof TAB_IDS)[number]

interface Tab {
  id: TabId
  labelKey: "tabs.organized" | "tabs.attended" | "tabs.claims"
  icon: string
  organizerOnly?: boolean
}

const TABS: Tab[] = [
  { id: "organized", labelKey: "tabs.organized", icon: "bx-calendar-star", organizerOnly: true },
  { id: "attended", labelKey: "tabs.attended", icon: "bx-calendar-check" },
  { id: "claims", labelKey: "tabs.claims", icon: "bx-calendar-plus" },
]

interface EventsTabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  isOrganizer: boolean
  counts?: {
    organized?: number
    attended?: number
    pendingClaims?: number
  }
}

export default function EventsTabs({
  activeTab,
  onTabChange,
  isOrganizer,
  counts = {},
}: EventsTabsProps) {
  const t = useTranslations("adminEvents")
  const visibleTabs = TABS.filter((tab) => !tab.organizerOnly || isOrganizer)

  return (
    <div className="events-page-tabs">
      {visibleTabs.map((tab) => {
        const count =
          tab.id === "organized"
            ? counts.organized
            : tab.id === "attended"
              ? counts.attended
              : tab.id === "claims"
                ? counts.pendingClaims
                : undefined

        return (
          <button
            key={tab.id}
            type="button"
            className={`events-page-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <i className={`bx ${tab.icon}`} />
            <span>{t(tab.labelKey)}</span>
            {count !== undefined && count > 0 && <span className="events-tab-badge">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
