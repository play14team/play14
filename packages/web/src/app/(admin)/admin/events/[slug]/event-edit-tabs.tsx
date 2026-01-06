"use client"

export const TAB_IDS = [
  "basics",
  "content",
  "team",
  "schedule",
  "media",
] as const
export type TabId = (typeof TAB_IDS)[number]

interface Tab {
  id: TabId
  label: string
  icon: string
}

const TABS: Tab[] = [
  { id: "basics", label: "Basics", icon: "bx-info-circle" },
  { id: "content", label: "Content", icon: "bx-edit" },
  { id: "team", label: "Team & Sponsors", icon: "bx-group" },
  { id: "schedule", label: "Tickets", icon: "bx-credit-card" },
  { id: "media", label: "Media & Finance", icon: "bx-images" },
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
  return (
    <div className="event-edit-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`event-edit-tab ${activeTab === tab.id ? "active" : ""} ${tabErrors[tab.id] ? "has-error" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          <i className={`bx ${tab.icon}`}></i>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
