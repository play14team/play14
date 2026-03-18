"use client"

import { useTranslations } from "next-intl"
import { useCallback, useState } from "react"
import { useToast } from "@/components/admin/toast/toast-context"
import { getNewsletterForEdit, type NewsletterForEdit } from "./newsletter.action"
import NewsletterForm from "./newsletter-form"
import NewsletterHistory from "./newsletter-history"

type Tab = "compose" | "history"

export default function NewsletterManager() {
  const t = useTranslations("adminMisc.newsletter")
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
        toast.error(t("editFailed"))
      }
    },
    [t, toast]
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
          {t("compose")}
        </button>
        <button
          type="button"
          className={`newsletter-tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <i className="bx bx-history" />
          {t("history")}
        </button>
        {activeTab === "compose" && (
          <button
            type="button"
            className="newsletter-tab newsletter-tab-new"
            onClick={handleNewNewsletter}
            title={t("newTooltip")}
          >
            <i className="bx bx-plus" />
            {t("new")}
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
