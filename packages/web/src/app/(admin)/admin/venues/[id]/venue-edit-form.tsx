"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/admin/toast"
import VenueMapPicker, { type MapLocation } from "@/components/admin/venue-map-picker"
import VenueLogoManager from "@/components/admin/venue-logo-manager"
import {
  updateVenue,
  deleteVenue,
  type VenueForEdit,
} from "../venues.action"
import { type VenueLogo } from "../logo.action"

interface Props {
  venue: VenueForEdit
}

export default function VenueEditForm({ venue }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form state
  const [name, setName] = useState(venue.name)
  const [website, setWebsite] = useState(venue.website || "")
  const [addressDetails, setAddressDetails] = useState(venue.addressDetails || "")
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(venue.location)

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
      toast.error(result.error || "Failed to update venue")
      setIsSubmitting(false)
      return
    }

    toast.success("Venue updated successfully!")
    router.refresh()
    setIsSubmitting(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    const result = await deleteVenue(venue.documentId)

    if (!result.success) {
      toast.error(result.error || "Failed to delete venue")
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      return
    }

    toast.success("Venue deleted successfully!")
    router.push("/admin/venues")
  }

  const canDelete = venue.eventsCount === 0

  // Convert venue.logo to VenueLogo format with normalized URLs
  const getLogoWithUrls = (): VenueLogo | null => {
    if (!venue.logo) return null
    const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
    const normalizeUrl = (url: string) => url.startsWith("http") ? url : `${baseUrl}${url}`
    return {
      id: venue.logo.id,
      name: venue.logo.name || venue.name,
      url: normalizeUrl(venue.logo.url),
      formats: venue.logo.formats ? {
        thumbnail: venue.logo.formats.thumbnail ? { ...venue.logo.formats.thumbnail, url: normalizeUrl(venue.logo.formats.thumbnail.url) } : undefined,
        small: venue.logo.formats.small ? { ...venue.logo.formats.small, url: normalizeUrl(venue.logo.formats.small.url) } : undefined,
        medium: venue.logo.formats.medium ? { ...venue.logo.formats.medium, url: normalizeUrl(venue.logo.formats.medium.url) } : undefined,
        large: venue.logo.formats.large ? { ...venue.logo.formats.large, url: normalizeUrl(venue.logo.formats.large.url) } : undefined,
      } : undefined,
    }
  }

  const handleLogoUpdate = () => {
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form venue-edit-form">
      <div className="admin-form-section">
        <h2>Venue Details</h2>

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
              placeholder="e.g., Hilton Conference Center"
            />
            <p className="admin-form-help">
              The full name of the venue
            </p>
          </div>
        </div>

        <VenueLogoManager
          venueId={venue.documentId}
          logo={getLogoWithUrls()}
          onUpdate={handleLogoUpdate}
        />

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="website">Website</label>
            <input
              type="url"
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="admin-input"
              placeholder="https://example.com"
            />
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="addressDetails">Address Details</label>
            <input
              type="text"
              id="addressDetails"
              value={addressDetails}
              onChange={(e) => setAddressDetails(e.target.value)}
              className="admin-input"
              placeholder="e.g., 123 Main Street, Suite 100"
            />
            <p className="admin-form-help">
              The physical address of the venue
            </p>
          </div>
        </div>
      </div>

      <div className="admin-form-section">
        <h2>Map Location</h2>
        <p className="admin-form-section-description">
          Set the coordinates for this venue on the map. This is used for displaying the venue location.
        </p>

        <div className="admin-form-row">
          <div className="admin-form-group full-width">
            <VenueMapPicker
              value={mapLocation}
              onChange={setMapLocation}
              height="400px"
            />
          </div>
        </div>
      </div>

      {venue.eventsCount > 0 && (
        <div className="admin-form-section">
          <h2>Associated Events</h2>
          <p className="admin-form-section-description">
            This venue is used by {venue.eventsCount} event{venue.eventsCount !== 1 ? "s" : ""}.
          </p>
          <div className="venue-events-list">
            {venue.events.map((event) => (
              <a
                key={event.id}
                href={`/admin/events/${event.slug}`}
                className="venue-event-link"
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
            Delete Venue
          </button>
        )}

        {!canDelete && (
          <p className="admin-form-help">
            <i className="bx bx-info-circle"></i>
            Cannot delete: this venue has {venue.eventsCount} event{venue.eventsCount !== 1 ? "s" : ""} attached.
          </p>
        )}

        {showDeleteConfirm && (
          <div className="admin-delete-confirm">
            <span>Are you sure you want to delete this venue?</span>
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
