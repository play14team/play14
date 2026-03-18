"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useToast } from "@/components/admin/toast"
import { createSponsor } from "../sponsors.action"

export default function SponsorCreateForm() {
  const router = useRouter()
  const toast = useToast()
  const t = useTranslations("adminCrud")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!name.trim()) {
      toast.error(t("common.nameRequired"))
      setIsSubmitting(false)
      return
    }

    const result = await createSponsor({
      name: name.trim(),
      url: url.trim() || undefined,
    })

    if (!result.success) {
      toast.error(result.error || t("common.failedToCreate", { entity: t("sponsors.entityName") }))
      setIsSubmitting(false)
      return
    }

    toast.success(t("common.createdSuccess", { entity: t("sponsors.entityName") }))
    router.push(`/admin/sponsors/${result.documentId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form venue-edit-form">
      <div className="admin-form-section">
        <h2>{t("sponsors.form.detailsTitle")}</h2>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="name">{t("sponsors.form.nameLabel")}</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="admin-input"
              placeholder={t("sponsors.form.namePlaceholder")}
            />
            <p className="admin-form-help">{t("sponsors.form.nameHelp")}</p>
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="url">{t("sponsors.form.urlLabel")}</label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="admin-input"
              placeholder={t("sponsors.form.urlPlaceholder")}
            />
            <p className="admin-form-help">{t("sponsors.form.urlHelp")}</p>
          </div>
        </div>
      </div>

      <div className="admin-form-section">
        <h2>{t("sponsors.form.additionalTitle")}</h2>
        <p className="admin-form-section-description">{t("sponsors.form.additionalDescription")}</p>
      </div>

      <div className="admin-form-actions">
        <button
          type="submit"
          className="admin-btn admin-btn-primary"
          disabled={isSubmitting}
          data-save-shortcut
        >
          {isSubmitting ? (
            <>
              <i className="bx bx-loader-alt bx-spin" />
              {t("common.creating")}
            </>
          ) : (
            <>
              <i className="bx bx-plus" />
              {t("sponsors.create.submitButton")}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
