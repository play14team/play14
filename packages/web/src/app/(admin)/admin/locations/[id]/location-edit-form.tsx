"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/admin/toast"
import LocationMapPicker, { type MapLocation } from "@/components/admin/location-map-picker"
import CountrySelector from "@/components/admin/country-selector"
import {
  updateLocation,
  deleteLocation,
  type LocationForEdit,
} from "../locations.action"

interface Props {
  location: LocationForEdit
}

export default function LocationEditForm({ location }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form state
  const [name, setName] = useState(location.name)
  const [country, setCountry] = useState(location.country)
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(location.location)

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
    router.refresh()
    setIsSubmitting(false)
  }

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
      <div className="admin-form-section">
        <h2>Location Details</h2>

        <div className="admin-form-row">
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
            <p className="admin-form-help">
              The city or region name where events take place
            </p>
          </div>
        </div>

        <div className="admin-form-row">
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
      </div>

      <div className="admin-form-section">
        <h2>Map Location</h2>
        <p className="admin-form-section-description">
          Set the coordinates for this location on the map. This is used for displaying events on maps.
        </p>

        <div className="admin-form-row">
          <div className="admin-form-group full-width">
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
      </div>

      {location.eventsCount > 0 && (
        <div className="admin-form-section">
          <h2>Associated Events</h2>
          <p className="admin-form-section-description">
            This location is used by {location.eventsCount} event{location.eventsCount !== 1 ? "s" : ""}.
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

      <div className="admin-form-actions">
        <button
          type="submit"
          className="admin-btn admin-btn-primary"
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
              Save Changes
            </>
          )}
        </button>

        {canDelete && !showDeleteConfirm && (
          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <i className="bx bx-trash"></i>
            Delete Location
          </button>
        )}

        {!canDelete && (
          <p className="admin-form-help">
            <i className="bx bx-info-circle"></i>
            Cannot delete: this location has {location.eventsCount} event{location.eventsCount !== 1 ? "s" : ""} attached.
          </p>
        )}

        {showDeleteConfirm && (
          <div className="admin-delete-confirm">
            <span>Are you sure you want to delete this location?</span>
            <button
              type="button"
              className="admin-btn admin-btn-danger"
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
              className="admin-btn admin-btn-secondary"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </form>
  )
}
