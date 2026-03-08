"use client"

export const TAB_IDS = ["profile", "stripe", "settings"] as const
export type ProfileTabId = (typeof TAB_IDS)[number]

interface Tab {
  id: ProfileTabId
  label: string
  icon: string
}

const TABS: Tab[] = [
  { id: "profile", label: "Profile", icon: "bx-user" },
  { id: "stripe", label: "Stripe", icon: "bx-credit-card" },
  { id: "settings", label: "Settings", icon: "bx-cog" },
]

interface ProfileTabsProps {
  activeTab: ProfileTabId
  onTabChange: (tab: ProfileTabId) => void
  showStripeTab: boolean
  showSettingsTab: boolean
}

export default function ProfileTabs({
  activeTab,
  onTabChange,
  showStripeTab,
  showSettingsTab,
}: ProfileTabsProps) {
  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === "stripe") return showStripeTab
    if (tab.id === "settings") return showSettingsTab
    return true
  })

  // Don't show tabs if there's only one
  if (visibleTabs.length <= 1) {
    return null
  }

  return (
    <div className="profile-tabs">
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`profile-tab ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          <i className={`bx ${tab.icon}`} />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
