"use client"

import { useEffect, useRef, useState } from "react"
import LocationMapPicker, { type MapLocation } from "./location-map-picker"
import CountrySelector from "./country-selector"
import { createLocation } from "@/app/(admin)/admin/locations/locations.action"
import { useToast } from "./toast"

interface CreateLocationModalProps {
  isOpen: boolean
  onClose: () => void
  onLocationCreated: (location: { documentId: string; name: string; country: string }) => void
}

export default function CreateLocationModal({
  isOpen,
  onClose,
  onLocationCreated,
}: CreateLocationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [country, setCountry] = useState("")
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(null)

  // Handle dialog open/close with native dialog API
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }

    dialog.addEventListener("cancel", handleCancel)
    return () => dialog.removeEventListener("cancel", handleCancel)
  }, [onClose])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current
    if (!dialog) return

    const rect = dialog.getBoundingClientRect()
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.bottom &&
      rect.left <= e.clientX &&
      e.clientX <= rect.right

    if (!isInDialog) {
      onClose()
    }
  }

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("")
      setCountry("")
      setMapLocation(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!name.trim()) {
      toast.error("Name is required")
      setIsSubmitting(false)
      return
    }

    if (!country) {
      toast.error("Please select a country")
      setIsSubmitting(false)
      return
    }

    const result = await createLocation({
      name: name.trim(),
      country: country.toUpperCase(),
      location: mapLocation,
    })

    if (!result.success) {
      toast.error(result.error || "Failed to create location")
      setIsSubmitting(false)
      return
    }

    toast.success("Location created successfully!")

    // Call the callback with the new location
    onLocationCreated({
      documentId: result.documentId!,
      name: name.trim(),
      country: country.toUpperCase(),
    })

    onClose()
    setIsSubmitting(false)
  }

  return (
    <dialog
      ref={dialogRef}
      className="create-location-modal"
      onClick={handleBackdropClick}
    >
      <div className="create-location-modal-content">
        <div className="create-location-modal-header">
          <h2>
            <i className="bx bx-map-pin"></i>
            Create New Location
          </h2>
          <button
            type="button"
            className="create-location-modal-close"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <i className="bx bx-x"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="create-location-modal-body">
            <div className="admin-form-group">
              <label htmlFor="modal-location-name">Location Name *</label>
              <input
                type="text"
                id="modal-location-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                className="admin-input"
                placeholder="e.g., Paris, Luxembourg, Berlin"
                autoFocus
              />
              <p className="admin-form-help">
                The city or region name where events take place
              </p>
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

            <div className="admin-form-group">
              <label>Map Location (optional)</label>
              <p className="admin-form-help" style={{ marginBottom: "12px" }}>
                Set the coordinates for displaying events on maps.
              </p>
              <LocationMapPicker
                value={mapLocation}
                onChange={setMapLocation}
                height="250px"
                centerOnLocation={name}
                autoFillFromLocation
                onCountryDetected={(code) => !country && setCountry(code)}
              />
            </div>
          </div>

          <div className="create-location-modal-footer">
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="bx bx-loader-alt bx-spin"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="bx bx-plus"></i>
                  Create Location
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
