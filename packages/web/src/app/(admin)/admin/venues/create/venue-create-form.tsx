"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useToast } from "@/components/admin/toast"
import VenueMapPicker, { type MapLocation } from "@/components/admin/venue-map-picker"
import { createVenue } from "../venues.action"

export default function VenueCreateForm() {
  const router = useRouter()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [website, setWebsite] = useState("")
  const [addressDetails, setAddressDetails] = useState("")
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!name.trim()) {
      toast.error("Name is required")
      setIsSubmitting(false)
      return
    }

    const result = await createVenue({
      name: name.trim(),
      website: website.trim() || undefined,
      addressDetails: addressDetails.trim() || undefined,
      location: mapLocation,
    })

    if (!result.success) {
      toast.error(result.error || "Failed to create venue")
      setIsSubmitting(false)
      return
    }

    toast.success("Venue created successfully!")
    router.push(`/admin/venues/${result.documentId}`)
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
            <p className="admin-form-help">The full name of the venue</p>
          </div>
        </div>

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
            <p className="admin-form-help">The physical address of the venue</p>
          </div>
        </div>
      </div>

      <div className="admin-form-section">
        <h2>Map Location</h2>
        <p className="admin-form-section-description">
          Set the coordinates for this venue on the map. This is used for displaying the venue
          location.
        </p>

        <div className="admin-form-row">
          <div className="admin-form-group full-width">
            <VenueMapPicker
              value={mapLocation}
              onChange={setMapLocation}
              height="400px"
              centerOnLocation={addressDetails || name}
              autoFillFromLocation
            />
          </div>
        </div>
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
              Creating...
            </>
          ) : (
            <>
              <i className="bx bx-plus" />
              Create Venue
            </>
          )}
        </button>
      </div>
    </form>
  )
}
