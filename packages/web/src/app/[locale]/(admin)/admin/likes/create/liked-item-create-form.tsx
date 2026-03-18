"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useToast } from "@/components/admin/toast"
import { createLikedItem } from "../liked-items.action"

export default function LikedItemCreateForm() {
  const router = useRouter()
  const toast = useToast()
  const t = useTranslations("adminCrud")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!name.trim()) {
      toast.error(t("common.nameRequired"))
      setIsSubmitting(false)
      return
    }

    if (!url.trim()) {
      toast.error(t("likes.form.urlRequired"))
      setIsSubmitting(false)
      return
    }

    const result = await createLikedItem({
      name: name.trim(),
      description: description.trim() || undefined,
      url: url.trim(),
    })

    if (!result.success) {
      toast.error(result.error || t("common.failedToCreate", { entity: t("likes.entityName") }))
      setIsSubmitting(false)
      return
    }

    toast.success(t("common.createdSuccess", { entity: t("likes.entityName") }))
    router.push(`/admin/likes/${result.documentId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form venue-edit-form">
      <div className="admin-form-section">
        <h2>{t("likes.form.detailsTitle")}</h2>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="name">{t("likes.form.nameLabel")}</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="admin-input"
              placeholder={t("likes.form.namePlaceholder")}
            />
            <p className="admin-form-help">{t("likes.form.nameHelp")}</p>
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="url">{t("likes.form.urlLabel")}</label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="admin-input"
              placeholder={t("likes.form.urlPlaceholder")}
            />
            <p className="admin-form-help">{t("likes.form.urlHelp")}</p>
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="description">{t("likes.form.descriptionLabel")}</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="admin-input"
              rows={3}
              placeholder={t("likes.form.descriptionPlaceholder")}
            />
            <p className="admin-form-help">{t("likes.form.descriptionHelp")}</p>
          </div>
        </div>
      </div>

      <div className="admin-form-section">
        <h2>{t("likes.form.additionalTitle")}</h2>
        <p className="admin-form-section-description">{t("likes.form.additionalDescription")}</p>
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
              {t("likes.create.submitButton")}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
