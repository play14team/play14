"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/admin/toast"
import LocationMapPicker, { type MapLocation } from "@/components/admin/location-map-picker"
import CountrySelector from "@/components/admin/country-selector"
import { createLocation } from "../locations.action"

export default function LocationCreateForm() {
  const router = useRouter()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [country, setCountry] = useState("")
  const [mapLocation, setMapLocation] = useState<MapLocation | null>(null)

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
    router.push(`/admin/locations/${result.documentId}`)
  }

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

      <div className="admin-form-actions">
        <button
          type="submit"
          className="admin-btn admin-btn-primary"
          disabled={isSubmitting}
          data-save-shortcut
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
  )
}
