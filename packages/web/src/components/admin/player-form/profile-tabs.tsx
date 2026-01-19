"use client"

export const TAB_IDS = ["profile", "stripe"] as const
export type ProfileTabId = (typeof TAB_IDS)[number]

interface Tab {
  id: ProfileTabId
  label: string
  icon: string
}

const TABS: Tab[] = [
  { id: "profile", label: "Profile", icon: "bx-user" },
  { id: "stripe", label: "Stripe", icon: "bx-credit-card" },
]

interface ProfileTabsProps {
  activeTab: ProfileTabId
  onTabChange: (tab: ProfileTabId) => void
  showStripeTab: boolean
}

export default function ProfileTabs({ activeTab, onTabChange, showStripeTab }: ProfileTabsProps) {
  const visibleTabs = showStripeTab ? TABS : TABS.filter((tab) => tab.id !== "stripe")

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
