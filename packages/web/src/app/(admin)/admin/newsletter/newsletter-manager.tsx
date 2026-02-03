"use client"

import { useCallback, useState } from "react"
import { useToast } from "@/components/admin/toast/toast-context"
import { getNewsletterForEdit, type NewsletterForEdit } from "./newsletter.action"
import NewsletterForm from "./newsletter-form"
import NewsletterHistory from "./newsletter-history"

type Tab = "compose" | "history"

export default function NewsletterManager() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<Tab>("compose")
  const [editingNewsletter, setEditingNewsletter] = useState<NewsletterForEdit | null>(null)
  const [isLoadingEdit, setIsLoadingEdit] = useState(false)
  // Used to force remount when loading a different newsletter
  const [formKey, setFormKey] = useState(0)

  const handleEditNewsletter = useCallback(
    async (newsletterId: string) => {
      setIsLoadingEdit(true)
      const newsletter = await getNewsletterForEdit(newsletterId)
      setIsLoadingEdit(false)

      if (newsletter) {
        setEditingNewsletter(newsletter)
        setFormKey((prev) => prev + 1) // Force remount to reset form with new data
        setActiveTab("compose")
      } else {
        toast.error("Failed to load newsletter for editing")
      }
    },
    [toast]
  )

  const handleNewNewsletter = useCallback(() => {
    setEditingNewsletter(null)
    setFormKey((prev) => prev + 1) // Force remount to reset form
    setActiveTab("compose")
  }, [])

  const handleSwitchToCompose = useCallback(() => {
    // Just switch tab without resetting the form
    setActiveTab("compose")
  }, [])

  return (
    <div className="newsletter-manager">
      <div className="newsletter-tabs">
        <button
          type="button"
          className={`newsletter-tab ${activeTab === "compose" ? "active" : ""}`}
          onClick={handleSwitchToCompose}
        >
          <i className="bx bx-edit" />
          Compose
        </button>
        <button
          type="button"
          className={`newsletter-tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <i className="bx bx-history" />
          History
        </button>
        {activeTab === "compose" && (
          <button
            type="button"
            className="newsletter-tab newsletter-tab-new"
            onClick={handleNewNewsletter}
            title="Start a new newsletter"
          >
            <i className="bx bx-plus" />
            New
          </button>
        )}
      </div>

      <div className="newsletter-content">
        <div style={{ display: activeTab === "compose" ? "block" : "none" }}>
          <NewsletterForm newsletter={editingNewsletter ?? undefined} key={formKey} />
        </div>
        <div style={{ display: activeTab === "history" ? "block" : "none" }}>
          <NewsletterHistory onEdit={handleEditNewsletter} isLoadingEdit={isLoadingEdit} />
        </div>
      </div>
    </div>
  )
}
