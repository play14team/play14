"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import SponsorLogoManager from "@/components/admin/sponsor-logo-manager"
import { useToast } from "@/components/admin/toast"
import UnsavedChangesDialog from "@/components/admin/unsaved-changes-dialog"
import { useBeforeUnload, useFormDirty } from "@/hooks/use-form-dirty"
import type { SponsorLogo } from "../logo.action"
import {
  deleteSponsor,
  type SocialNetwork,
  type SponsorForEdit,
  updateSponsor,
} from "../sponsors.action"

const SOCIAL_NETWORK_TYPES = [
  "Twitter",
  "LinkedIn",
  "Facebook",
  "Youtube",
  "Instagram",
  "Xing",
  "Email",
  "Website",
  "Wikipedia",
  "Vimeo",
  "Other",
]

interface Props {
  sponsor: SponsorForEdit
}

export default function SponsorEditForm({ sponsor }: Props) {
  const router = useRouter()
  const toast = useToast()
  const t = useTranslations("adminCrud")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Navigation warning state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const pendingNavigationRef = useRef<string | null>(null)

  // Form state
  const [name, setName] = useState(sponsor.name)
  const [url, setUrl] = useState(sponsor.url || "")
  const [socialNetworks, setSocialNetworks] = useState<SocialNetwork[]>(
    sponsor.socialNetworks || []
  )

  // Track dirty state
  const formValues = useMemo(
    () => ({ name, url, socialNetworks: JSON.stringify(socialNetworks) }),
    [name, url, socialNetworks]
  )
  const { isDirty, resetDirtyState } = useFormDirty(formValues)

  // Browser beforeunload warning
  useBeforeUnload(isDirty)

  // Intercept Link clicks to warn about unsaved changes
  useEffect(() => {
    if (!isDirty) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest("a")

      if (!link) return

      // Check if it's an internal navigation link
      const href = link.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return

      // Check if it's an external link (opens in new tab)
      if (link.target === "_blank") return

      // Prevent navigation and show dialog
      e.preventDefault()
      e.stopPropagation()
      pendingNavigationRef.current = href
      setShowUnsavedDialog(true)
    }

    // Capture phase to intercept before Next.js router
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [isDirty])

  // Handle browser back/forward navigation
  useEffect(() => {
    if (!isDirty) return

    const handlePopState = () => {
      // Push current state back to prevent navigation
      window.history.pushState(null, "", window.location.href)
      setShowUnsavedDialog(true)
      pendingNavigationRef.current = "back"
    }

    // Push initial state
    window.history.pushState(null, "", window.location.href)
    window.addEventListener("popstate", handlePopState)

    return () => window.removeEventListener("popstate", handlePopState)
  }, [isDirty])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await updateSponsor(sponsor.documentId, {
      name: name.trim(),
      url: url.trim() || undefined,
      socialNetworks: socialNetworks.filter((sn) => sn.url.trim()),
    })

    if (!result.success) {
      toast.error(result.error || t("common.failedToUpdate", { entity: t("sponsors.entityName") }))
      setIsSubmitting(false)
      return
    }

    toast.success(t("common.updatedSuccess", { entity: t("sponsors.entityName") }))
    resetDirtyState()
    router.refresh()
    setIsSubmitting(false)
  }

  // Social networks handlers
  const addSocialNetwork = () => {
    setSocialNetworks([...socialNetworks, { url: "", type: "Website" }])
  }

  const updateSocialNetwork = (index: number, field: "url" | "type", value: string) => {
    const updated = [...socialNetworks]
    updated[index] = { ...updated[index], [field]: value }
    setSocialNetworks(updated)
  }

  const removeSocialNetwork = (index: number) => {
    setSocialNetworks(socialNetworks.filter((_, i) => i !== index))
  }

  // Navigation handlers for unsaved changes dialog
  const handleSaveAndNavigate = useCallback(async () => {
    setIsSubmitting(true)

    const result = await updateSponsor(sponsor.documentId, {
      name: name.trim(),
      url: url.trim() || undefined,
      socialNetworks: socialNetworks.filter((sn) => sn.url.trim()),
    })

    if (result.success) {
      toast.success(t("common.updatedSuccess", { entity: t("sponsors.entityName") }))
      resetDirtyState()
      setShowUnsavedDialog(false)

      // Navigate after save
      const destination = pendingNavigationRef.current
      pendingNavigationRef.current = null

      if (destination === "back") {
        router.back()
      } else if (destination) {
        router.push(destination)
      }
    } else {
      toast.error(result.error || t("common.failedToUpdate", { entity: t("sponsors.entityName") }))
    }

    setIsSubmitting(false)
  }, [sponsor.documentId, name, url, socialNetworks, toast, resetDirtyState, router, t])

  const handleDiscardAndNavigate = useCallback(() => {
    resetDirtyState()
    setShowUnsavedDialog(false)

    const destination = pendingNavigationRef.current
    pendingNavigationRef.current = null

    if (destination === "back") {
      router.back()
    } else if (destination) {
      router.push(destination)
    }
  }, [resetDirtyState, router])

  const handleCancelNavigation = useCallback(() => {
    pendingNavigationRef.current = null
    setShowUnsavedDialog(false)
  }, [])

  const handleDiscard = useCallback(() => {
    // Reset form to initial values
    const initialName = sponsor.name
    const initialUrl = sponsor.url || ""
    const initialSocialNetworks = sponsor.socialNetworks || []

    setName(initialName)
    setUrl(initialUrl)
    setSocialNetworks(initialSocialNetworks)

    // Pass the initial values to resetDirtyState to avoid stale closure issue
    resetDirtyState({
      name: initialName,
      url: initialUrl,
      socialNetworks: JSON.stringify(initialSocialNetworks),
    })
  }, [sponsor, resetDirtyState])

  const handleDelete = async () => {
    setIsDeleting(true)

    const result = await deleteSponsor(sponsor.documentId)

    if (!result.success) {
      toast.error(result.error || t("common.failedToDelete", { entity: t("sponsors.entityName") }))
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      return
    }

    toast.success(t("common.deletedSuccess", { entity: t("sponsors.entityName") }))
    router.push("/admin/sponsors")
  }

  const canDelete = sponsor.eventsCount === 0

  // Convert sponsor.logo to SponsorLogo format with normalized URLs
  const getLogoWithUrls = (): SponsorLogo | null => {
    if (!sponsor.logo) return null
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
    const normalizeUrl = (url: string) => (url.startsWith("http") ? url : `${baseUrl}${url}`)
    return {
      id: sponsor.logo.id,
      name: sponsor.logo.name || sponsor.name,
      url: normalizeUrl(sponsor.logo.url),
      formats: sponsor.logo.formats
        ? {
            thumbnail: sponsor.logo.formats.thumbnail
              ? {
                  ...sponsor.logo.formats.thumbnail,
                  url: normalizeUrl(sponsor.logo.formats.thumbnail.url),
                }
              : undefined,
            small: sponsor.logo.formats.small
              ? { ...sponsor.logo.formats.small, url: normalizeUrl(sponsor.logo.formats.small.url) }
              : undefined,
            medium: sponsor.logo.formats.medium
              ? {
                  ...sponsor.logo.formats.medium,
                  url: normalizeUrl(sponsor.logo.formats.medium.url),
                }
              : undefined,
            large: sponsor.logo.formats.large
              ? { ...sponsor.logo.formats.large, url: normalizeUrl(sponsor.logo.formats.large.url) }
              : undefined,
          }
        : undefined,
    }
  }

  const handleLogoUpdate = () => {
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form sponsor-edit-form">
      <div className="sponsor-edit-layout">
        <div className="sponsor-edit-details">
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
                <SponsorLogoManager
                  sponsorId={sponsor.documentId}
                  sponsorName={sponsor.name}
                  logo={getLogoWithUrls()}
                  onUpdate={handleLogoUpdate}
                />
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
              </div>
            </div>
          </div>

          <div className="admin-form-section">
            <h2>{t("sponsors.form.socialTitle")}</h2>
            <p className="admin-form-section-description">{t("sponsors.form.socialDescription")}</p>

            <div className="admin-form-row">
              <div className="admin-form-group full-width">
                {socialNetworks.map((sn, index) => (
                  <div key={index} className="social-network-row">
                    <select
                      value={sn.type}
                      onChange={(e) => updateSocialNetwork(index, "type", e.target.value)}
                      className="admin-select"
                    >
                      {SOCIAL_NETWORK_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <input
                      type="url"
                      value={sn.url}
                      onChange={(e) => updateSocialNetwork(index, "url", e.target.value)}
                      className="admin-input"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      className="admin-btn admin-btn-icon admin-btn-danger"
                      onClick={() => removeSocialNetwork(index)}
                      title={t("common.remove")}
                    >
                      <i className="bx bx-trash" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={addSocialNetwork}
                >
                  <i className="bx bx-plus" />
                  {t("sponsors.form.addSocialNetwork")}
                </button>
              </div>
            </div>
          </div>

          {sponsor.eventsCount > 0 && (
            <div className="admin-form-section">
              <h2>{t("common.associatedEvents")}</h2>
              <p className="admin-form-section-description">
                {t("common.associatedEventsDescription", {
                  entity: t("sponsors.entityName"),
                  count: sponsor.eventsCount,
                })}
              </p>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <div className="venue-events-list">
                    {sponsor.events.map((event) => (
                      <a
                        key={event.id}
                        href={`/admin/events/${event.slug}`}
                        className="venue-event-link"
                      >
                        <i className="bx bx-calendar-event" />
                        <span>{event.name}</span>
                        <i className="bx bx-link-external" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sponsor-edit-actions">
          <div className="action-buttons">
            <button
              type="submit"
              className={`admin-btn admin-btn-primary admin-btn-block ${isDirty ? "admin-btn-dirty" : ""}`}
              disabled={isSubmitting}
              data-save-shortcut
            >
              {isSubmitting ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" />
                  {t("common.saving")}
                </>
              ) : (
                <>
                  <i className="bx bx-save" />
                  {t("common.saveChanges")}
                </>
              )}
            </button>

            {isDirty && (
              <button
                type="button"
                onClick={handleDiscard}
                className="admin-btn admin-btn-danger-outline admin-btn-block"
              >
                <i className="bx bx-undo" />
                {t("common.discardChanges")}
              </button>
            )}

            {canDelete && !showDeleteConfirm && (
              <button
                type="button"
                className="admin-btn admin-btn-danger admin-btn-block"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <i className="bx bx-trash" />
                {t("sponsors.edit.deleteButton")}
              </button>
            )}

            {!canDelete && (
              <p className="admin-form-help">
                <i className="bx bx-info-circle" />
                {t("common.cannotDelete", {
                  entity: t("sponsors.entityName"),
                  count: sponsor.eventsCount,
                })}
              </p>
            )}

            {showDeleteConfirm && (
              <div className="admin-delete-confirm">
                <span>{t("common.deleteConfirm", { entity: t("sponsors.entityName") })}</span>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger admin-btn-block"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin" />
                      {t("common.deleting")}
                    </>
                  ) : (
                    t("common.yesDelete")
                  )}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-block"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  {t("common.cancel")}
                </button>
              </div>
            )}
          </div>

          {/* Dirty State Indicator */}
          {isDirty && (
            <div className="dirty-indicator">
              <i className="bx bx-edit-alt" />
              <span>{t("common.unsavedChanges")}</span>
            </div>
          )}
        </div>
      </div>

      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSave={handleSaveAndNavigate}
        onDiscard={handleDiscardAndNavigate}
        onCancel={handleCancelNavigation}
        isSaving={isSubmitting}
      />

      <style jsx>{`
        .social-network-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          align-items: center;
        }

        .social-network-row .admin-select {
          width: 150px;
          flex-shrink: 0;
        }

        .social-network-row .admin-input {
          flex: 1;
        }
      `}</style>
    </form>
  )
}
