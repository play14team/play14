"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useToast } from "@/components/admin/toast"
import UnsavedChangesDialog from "@/components/admin/unsaved-changes-dialog"
import VenueLogoManager from "@/components/admin/venue-logo-manager"
import VenueMapPicker, { type MapLocation } from "@/components/admin/venue-map-picker"
import { useBeforeUnload, useFormDirty } from "@/hooks/use-form-dirty"
import type { VenueLogo } from "../logo.action"
import { deleteVenue, updateVenue, type VenueForEdit } from "../venues.action"

interface Props {
  venue: VenueForEdit
}

export default function VenueEditForm({ venue }: Props) {
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
  const [name, setName] = useState(venue.name)
  const [website, setWebsite] = useState(venue.website || "")
  const [addressDetails, setAddressDetails] = useState(venue.addressDetails || "")
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(venue.location)

  // Track dirty state
  const formValues = useMemo(
    () => ({ name, website, addressDetails, mapLocation }),
    [name, website, addressDetails, mapLocation]
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

    const result = await updateVenue(venue.documentId, {
      name: name.trim(),
      website: website.trim() || undefined,
      addressDetails: addressDetails.trim() || undefined,
      location: mapLocation,
    })

    if (!result.success) {
      toast.error(result.error || t("common.failedToUpdate", { entity: t("venues.entityName") }))
      setIsSubmitting(false)
      return
    }

    toast.success(t("common.updatedSuccess", { entity: t("venues.entityName") }))
    resetDirtyState()
    router.refresh()
    setIsSubmitting(false)
  }

  // ============================================
  // Navigation handlers for unsaved changes dialog
  // ============================================

  const handleSaveAndNavigate = useCallback(async () => {
    setIsSubmitting(true)

    const result = await updateVenue(venue.documentId, {
      name: name.trim(),
      website: website.trim() || undefined,
      addressDetails: addressDetails.trim() || undefined,
      location: mapLocation,
    })

    if (result.success) {
      toast.success(t("common.updatedSuccess", { entity: t("venues.entityName") }))
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
      toast.error(result.error || t("common.failedToUpdate", { entity: t("venues.entityName") }))
    }

    setIsSubmitting(false)
  }, [
    venue.documentId,
    name,
    website,
    addressDetails,
    mapLocation,
    toast,
    resetDirtyState,
    router,
    t,
  ])

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
    const initialName = venue.name
    const initialWebsite = venue.website || ""
    const initialAddressDetails = venue.addressDetails || ""
    const initialMapLocation = venue.location

    setName(initialName)
    setWebsite(initialWebsite)
    setAddressDetails(initialAddressDetails)
    setMapLocation(initialMapLocation)

    // Pass the initial values to resetDirtyState to avoid stale closure issue
    resetDirtyState({
      name: initialName,
      website: initialWebsite,
      addressDetails: initialAddressDetails,
      mapLocation: initialMapLocation,
    })
  }, [venue, resetDirtyState])

  const handleDelete = async () => {
    setIsDeleting(true)

    const result = await deleteVenue(venue.documentId)

    if (!result.success) {
      toast.error(result.error || t("common.failedToDelete", { entity: t("venues.entityName") }))
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      return
    }

    toast.success(t("common.deletedSuccess", { entity: t("venues.entityName") }))
    router.push("/admin/venues")
  }

  const canDelete = venue.eventsCount === 0

  // Convert venue.logo to VenueLogo format with normalized URLs
  const getLogoWithUrls = (): VenueLogo | null => {
    if (!venue.logo) return null
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
    const normalizeUrl = (url: string) => (url.startsWith("http") ? url : `${baseUrl}${url}`)
    return {
      id: venue.logo.id,
      name: venue.logo.name || venue.name,
      url: normalizeUrl(venue.logo.url),
      formats: venue.logo.formats
        ? {
            thumbnail: venue.logo.formats.thumbnail
              ? {
                  ...venue.logo.formats.thumbnail,
                  url: normalizeUrl(venue.logo.formats.thumbnail.url),
                }
              : undefined,
            small: venue.logo.formats.small
              ? { ...venue.logo.formats.small, url: normalizeUrl(venue.logo.formats.small.url) }
              : undefined,
            medium: venue.logo.formats.medium
              ? { ...venue.logo.formats.medium, url: normalizeUrl(venue.logo.formats.medium.url) }
              : undefined,
            large: venue.logo.formats.large
              ? { ...venue.logo.formats.large, url: normalizeUrl(venue.logo.formats.large.url) }
              : undefined,
          }
        : undefined,
    }
  }

  const handleLogoUpdate = () => {
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form venue-edit-form">
      <div className="venue-edit-layout">
        <div className="venue-edit-details">
          <div className="admin-form-section">
            <h2>{t("venues.form.detailsTitle")}</h2>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label htmlFor="name">{t("venues.form.nameLabel")}</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  className="admin-input"
                  placeholder={t("venues.form.namePlaceholder")}
                />
                <p className="admin-form-help">{t("venues.form.nameHelp")}</p>
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <VenueLogoManager
                  venueId={venue.documentId}
                  venueName={venue.name}
                  logo={getLogoWithUrls()}
                  onUpdate={handleLogoUpdate}
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label htmlFor="website">{t("venues.form.websiteLabel")}</label>
                <input
                  type="url"
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="admin-input"
                  placeholder={t("venues.form.websitePlaceholder")}
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label htmlFor="addressDetails">{t("venues.form.addressLabel")}</label>
                <input
                  type="text"
                  id="addressDetails"
                  value={addressDetails}
                  onChange={(e) => setAddressDetails(e.target.value)}
                  className="admin-input"
                  placeholder={t("venues.form.addressPlaceholder")}
                />
                <p className="admin-form-help">{t("venues.form.addressHelp")}</p>
              </div>
            </div>
          </div>

          {venue.eventsCount > 0 && (
            <div className="admin-form-section">
              <h2>{t("common.associatedEvents")}</h2>
              <p className="admin-form-section-description">
                {t("common.associatedEventsDescription", {
                  entity: t("venues.entityName"),
                  count: venue.eventsCount,
                })}
              </p>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <div className="venue-events-list">
                    {venue.events.map((event) => (
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

        <div className="venue-edit-map">
          <div className="admin-form-section">
            <h2>{t("venues.form.mapTitle")}</h2>
            <p className="admin-form-section-description">{t("venues.form.mapDescriptionShort")}</p>

            <VenueMapPicker value={mapLocation} onChange={setMapLocation} height="400px" />
          </div>
        </div>

        <div className="venue-edit-actions">
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
                {t("venues.edit.deleteButton")}
              </button>
            )}

            {!canDelete && (
              <p className="admin-form-help">
                <i className="bx bx-info-circle" />
                {t("common.cannotDelete", {
                  entity: t("venues.entityName"),
                  count: venue.eventsCount,
                })}
              </p>
            )}

            {showDeleteConfirm && (
              <div className="admin-delete-confirm">
                <span>{t("common.deleteConfirm", { entity: t("venues.entityName") })}</span>
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
    </form>
  )
}
