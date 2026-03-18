"use client"

import { useTranslations } from "next-intl"

export const TAB_IDS = [
  "basics",
  "content",
  "team",
  "schedule",
  "participants",
  "media",
  "budget",
  "actuals",
  "finance",
] as const
export type TabId = (typeof TAB_IDS)[number]

interface Tab {
  id: TabId
  labelKey: string
  icon: string
}

const TABS: Tab[] = [
  { id: "basics", labelKey: "editTabs.basics", icon: "bx-info-circle" },
  { id: "content", labelKey: "editTabs.content", icon: "bx-edit" },
  { id: "team", labelKey: "editTabs.team", icon: "bx-group" },
  { id: "schedule", labelKey: "editTabs.schedule", icon: "bx-credit-card" },
  { id: "participants", labelKey: "editTabs.participants", icon: "bx-user-check" },
  { id: "media", labelKey: "editTabs.media", icon: "bx-images" },
  { id: "budget", labelKey: "editTabs.budget", icon: "bx-calculator" },
  { id: "actuals", labelKey: "editTabs.actuals", icon: "bx-receipt" },
  { id: "finance", labelKey: "editTabs.finance", icon: "bx-dollar-circle" },
]

interface EventEditTabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  tabErrors?: Partial<Record<TabId, boolean>>
}

export default function EventEditTabs({
  activeTab,
  onTabChange,
  tabErrors = {},
}: EventEditTabsProps) {
  const t = useTranslations("adminEvents")
  return (
    <div className="event-edit-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`event-edit-tab ${activeTab === tab.id ? "active" : ""} ${tabErrors[tab.id] ? "has-error" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          <i className={`bx ${tab.icon}`} />
          <span>{t(tab.labelKey)}</span>
        </button>
      ))}
    </div>
  )
}
