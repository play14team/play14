"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import CountrySelector from "@/components/admin/country-selector"
import LocationMapPicker, { type MapLocation } from "@/components/admin/location-map-picker"
import { useToast } from "@/components/admin/toast"
import UnsavedChangesDialog from "@/components/admin/unsaved-changes-dialog"
import { useBeforeUnload, useFormDirty } from "@/hooks/use-form-dirty"
import { deleteLocation, type LocationForEdit, updateLocation } from "../locations.action"

interface Props {
  location: LocationForEdit
}

export default function LocationEditForm({ location }: Props) {
  const router = useRouter()
  const toast = useToast()
  const t = useTranslations("adminCrud")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Navigation warning state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const pendingNavigationRef = useRef<string | null>(null)

  // Normalize map location to ensure consistent serialization
  // The API may return extra fields or empty objects that cause dirty state issues
  const normalizeMapLocation = (loc: MapLocation | null): MapLocation | null => {
    if (!loc) return null
    // Only keep the fields we care about
    const { geometry, place_name } = loc
    if (!geometry?.coordinates) return null
    return {
      geometry: {
        coordinates: geometry.coordinates,
        type: geometry.type,
      },
      place_name,
    }
  }

  // Form state
  const [name, setName] = useState(location.name)
  const [country, setCountry] = useState(location.country)
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(() =>
    normalizeMapLocation(location.location)
  )

  // Track dirty state
  const formValues = useMemo(() => ({ name, country, mapLocation }), [name, country, mapLocation])
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

    const result = await updateLocation(location.documentId, {
      name: name.trim(),
      country: country.toUpperCase(),
      location: mapLocation,
    })

    if (!result.success) {
      toast.error(result.error || t("common.failedToUpdate", { entity: t("locations.entityName") }))
      setIsSubmitting(false)
      return
    }

    toast.success(t("common.updatedSuccess", { entity: t("locations.entityName") }))
    resetDirtyState()
    router.refresh()
    setIsSubmitting(false)
  }

  // ============================================
  // Navigation handlers for unsaved changes dialog
  // ============================================

  const handleSaveAndNavigate = useCallback(async () => {
    setIsSubmitting(true)

    const result = await updateLocation(location.documentId, {
      name: name.trim(),
      country: country.toUpperCase(),
      location: mapLocation,
    })

    if (result.success) {
      toast.success(t("common.updatedSuccess", { entity: t("locations.entityName") }))
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
      toast.error(result.error || t("common.failedToUpdate", { entity: t("locations.entityName") }))
    }

    setIsSubmitting(false)
  }, [location.documentId, name, country, mapLocation, toast, resetDirtyState, router])

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
    // Reset form to initial values (normalized for consistent comparison)
    const initialName = location.name
    const initialCountry = location.country
    const initialMapLocation = normalizeMapLocation(location.location)

    setName(initialName)
    setCountry(initialCountry)
    setMapLocation(initialMapLocation)

    // Pass the initial values to resetDirtyState to avoid stale closure issue
    resetDirtyState({
      name: initialName,
      country: initialCountry,
      mapLocation: initialMapLocation,
    })
  }, [location, resetDirtyState])

  const handleDelete = async () => {
    setIsDeleting(true)

    const result = await deleteLocation(location.documentId)

    if (!result.success) {
      toast.error(result.error || t("common.failedToDelete", { entity: t("locations.entityName") }))
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      return
    }

    toast.success(t("common.deletedSuccess", { entity: t("locations.entityName") }))
    router.push("/admin/locations")
  }

  const canDelete = location.eventsCount === 0

  return (
    <form onSubmit={handleSubmit} className="admin-form location-edit-form">
      <div className="location-edit-layout">
        <div className="location-edit-details">
          <div className="admin-form-section">
            <h2>{t("locations.form.detailsTitle")}</h2>

            <div className="admin-form-group">
              <label htmlFor="name">{t("locations.form.nameLabel")}</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className="admin-input"
                placeholder={t("locations.form.namePlaceholder")}
              />
              <p className="admin-form-help">{t("locations.form.nameHelp")}</p>
            </div>

            <div className="admin-form-group">
              <label>{t("locations.form.countryLabel")}</label>
              <CountrySelector value={country} onChange={setCountry} required />
            </div>
          </div>

          {location.eventsCount > 0 && (
            <div className="admin-form-section">
              <h2>{t("common.associatedEvents")}</h2>
              <p className="admin-form-section-description">
                {t("common.associatedEventsDescription", {
                  entity: t("locations.entityName"),
                  count: location.eventsCount,
                })}
              </p>
              <div className="location-events-list">
                {location.events.map((event) => (
                  <a
                    key={event.id}
                    href={`/admin/events/${event.slug}`}
                    className="location-event-link"
                  >
                    <i className="bx bx-calendar-event" />
                    <span>{event.name}</span>
                    <i className="bx bx-link-external" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="location-edit-map">
          <div className="admin-form-section">
            <h2>{t("locations.form.mapTitle")}</h2>
            <p className="admin-form-section-description">
              {t("locations.form.mapDescriptionShort")}
            </p>

            <LocationMapPicker
              value={mapLocation}
              onChange={setMapLocation}
              height="400px"
              centerOnLocation={name}
              autoFillFromLocation
              onCountryDetected={(code) => !country && setCountry(code)}
            />
          </div>
        </div>

        <div className="location-edit-actions">
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
                {t("locations.edit.deleteButton")}
              </button>
            )}

            {!canDelete && (
              <p className="admin-form-help">
                <i className="bx bx-info-circle" />
                {t("common.cannotDelete", {
                  entity: t("locations.entityName"),
                  count: location.eventsCount,
                })}
              </p>
            )}

            {showDeleteConfirm && (
              <div className="admin-delete-confirm">
                <span>{t("common.deleteConfirm", { entity: t("locations.entityName") })}</span>
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
