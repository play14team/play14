"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/admin/toast"
import { useFormDirty, useBeforeUnload } from "@/hooks/use-form-dirty"
import UnsavedChangesDialog from "@/components/admin/unsaved-changes-dialog"
import LocationMapPicker, { type MapLocation } from "@/components/admin/location-map-picker"
import CountrySelector from "@/components/admin/country-selector"
import { updateLocation, deleteLocation, type LocationForEdit } from "../locations.action"

interface Props {
  location: LocationForEdit
}

export default function LocationEditForm({ location }: Props) {
  const router = useRouter()
  const toast = useToast()
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
      toast.error(result.error || "Failed to update location")
      setIsSubmitting(false)
      return
    }

    toast.success("Location updated successfully!")
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
      toast.success("Location updated successfully!")
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
      toast.error(result.error || "Failed to update location")
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
      toast.error(result.error || "Failed to delete location")
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      return
    }

    toast.success("Location deleted successfully!")
    router.push("/admin/locations")
  }

  const canDelete = location.eventsCount === 0

  return (
    <form onSubmit={handleSubmit} className="admin-form location-edit-form">
      <div className="location-edit-layout">
        <div className="location-edit-details">
          <div className="admin-form-section">
            <h2>Location Details</h2>

            <div className="admin-form-group">
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className="admin-input"
                placeholder="e.g., Paris, Luxembourg, Berlin"
              />
              <p className="admin-form-help">The city or region name where events take place</p>
            </div>

            <div className="admin-form-group">
              <label>Country *</label>
              <CountrySelector
                value={country}
                onChange={setCountry}
                placeholder="Select a country..."
                required
              />
            </div>
          </div>

          {location.eventsCount > 0 && (
            <div className="admin-form-section">
              <h2>Associated Events</h2>
              <p className="admin-form-section-description">
                This location is used by {location.eventsCount} event
                {location.eventsCount !== 1 ? "s" : ""}.
              </p>
              <div className="location-events-list">
                {location.events.map((event) => (
                  <a
                    key={event.id}
                    href={`/admin/events/${event.slug}`}
                    className="location-event-link"
                  >
                    <i className="bx bx-calendar-event"></i>
                    <span>{event.name}</span>
                    <i className="bx bx-link-external"></i>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="location-edit-map">
          <div className="admin-form-section">
            <h2>Map Location</h2>
            <p className="admin-form-section-description">
              Set the coordinates for this location on the map.
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
            >
              {isSubmitting ? (
                <>
                  <i className="bx bx-loader-alt bx-spin"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="bx bx-save"></i>
                  Save changes
                </>
              )}
            </button>

            {isDirty && (
              <button
                type="button"
                onClick={handleDiscard}
                className="admin-btn admin-btn-danger-outline admin-btn-block"
              >
                <i className="bx bx-undo"></i>
                Discard changes
              </button>
            )}

            {canDelete && !showDeleteConfirm && (
              <button
                type="button"
                className="admin-btn admin-btn-danger admin-btn-block"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <i className="bx bx-trash"></i>
                Delete location
              </button>
            )}

            {!canDelete && (
              <p className="admin-form-help">
                <i className="bx bx-info-circle"></i>
                Cannot delete: this location has {location.eventsCount} event
                {location.eventsCount !== 1 ? "s" : ""} attached.
              </p>
            )}

            {showDeleteConfirm && (
              <div className="admin-delete-confirm">
                <span>Are you sure you want to delete this location?</span>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger admin-btn-block"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin"></i>
                      Deleting...
                    </>
                  ) : (
                    "Yes, Delete"
                  )}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-block"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Dirty State Indicator */}
          {isDirty && (
            <div className="dirty-indicator">
              <i className="bx bx-edit-alt"></i>
              <span>You have unsaved changes</span>
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
