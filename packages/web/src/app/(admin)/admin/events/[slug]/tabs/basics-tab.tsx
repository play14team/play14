"use client"

import { useState } from "react"
import type { LocationOption, VenueOption } from "../event-edit.action"
import { EVENT_STATUSES } from "../hooks/use-event-form"
import type { MapLocation } from "@/components/admin/location-map-picker"
import LocationSelector from "@/components/admin/location-selector"
import CreateLocationModal from "@/components/admin/create-location-modal"

interface BasicsTabProps {
  // Event Details
  name: string
  setName: (value: string) => void
  eventStatus: string
  setEventStatus: (value: string) => void
  tagline: string
  setTagline: (value: string) => void
  contactEmail: string
  setContactEmail: (value: string) => void

  // Date & Time
  startDate: string
  setStartDate: (value: string) => void
  startTime: string
  setStartTime: (value: string) => void
  endDate: string
  setEndDate: (value: string) => void
  endTime: string
  setEndTime: (value: string) => void
  timezone: string
  setTimezone: (value: string) => void
  allTimezones: { value: string; region: string }[]
  timezoneRegions: string[]

  // Location
  locationMode: "existing" | "new"
  setLocationMode: (value: "existing" | "new") => void
  selectedLocationId: string
  setSelectedLocationId: (value: string) => void
  newLocationName: string
  setNewLocationName: (value: string) => void
  newLocationCountry: string
  setNewLocationCountry: (value: string) => void
  newLocationMapLocation: MapLocation | null
  setNewLocationMapLocation: (value: MapLocation | null) => void
  locations: LocationOption[]
  onLocationAdded?: (location: LocationOption) => void

  // Venue
  venueMode: "existing" | "new" | "none"
  setVenueMode: (value: "existing" | "new" | "none") => void
  selectedVenueId: string
  setSelectedVenueId: (value: string) => void
  newVenueName: string
  setNewVenueName: (value: string) => void
  newVenueAddress: string
  setNewVenueAddress: (value: string) => void
  venues: VenueOption[]
}

export default function BasicsTab({
  name,
  setName,
  eventStatus,
  setEventStatus,
  tagline,
  setTagline,
  contactEmail,
  setContactEmail,
  startDate,
  setStartDate,
  startTime,
  setStartTime,
  endDate,
  setEndDate,
  endTime,
  setEndTime,
  timezone,
  setTimezone,
  allTimezones,
  timezoneRegions,
  selectedLocationId,
  setSelectedLocationId,
  setLocationMode,
  locations,
  onLocationAdded,
  venueMode,
  setVenueMode,
  selectedVenueId,
  setSelectedVenueId,
  newVenueName,
  setNewVenueName,
  newVenueAddress,
  setNewVenueAddress,
  venues,
}: BasicsTabProps) {
  // Modal state for creating new location
  const [isCreateLocationModalOpen, setIsCreateLocationModalOpen] = useState(false)

  // Local state for locations list (to add new locations without page refresh)
  const [localLocations, setLocalLocations] = useState<LocationOption[]>(locations)

  const handleCreateNewLocation = () => {
    setIsCreateLocationModalOpen(true)
  }

  const handleLocationCreated = (newLocation: { documentId: string; name: string; country: string }) => {
    // Add the new location to the local list
    const locationOption: LocationOption = {
      documentId: newLocation.documentId,
      name: newLocation.name,
      country: newLocation.country,
    }
    setLocalLocations((prev) => [...prev, locationOption].sort((a, b) => a.name.localeCompare(b.name)))

    // Select the newly created location
    setSelectedLocationId(newLocation.documentId)

    // Ensure we're in "existing" mode now that we have a location selected
    setLocationMode("existing")

    // Notify parent if callback provided
    onLocationAdded?.(locationOption)
  }

  return (
    <>
      {/* Event Details Section */}
      <div className="admin-form-section">
        <h2>Event Details</h2>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="name">Event Name *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="admin-input"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="eventStatus">Status</label>
            <select
              id="eventStatus"
              value={eventStatus}
              onChange={(e) => setEventStatus(e.target.value)}
              className="admin-select"
            >
              {EVENT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-form-group">
          <label htmlFor="tagline">Tagline</label>
          <input
            type="text"
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="admin-input"
            placeholder="A short memorable phrase for this event"
          />
        </div>

        <div className="admin-form-group">
          <label htmlFor="contactEmail">Contact Email</label>
          <input
            type="email"
            id="contactEmail"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="admin-input"
            placeholder="email@example.com"
          />
        </div>
      </div>

      {/* Date & Time Section */}
      <div className="admin-form-section">
        <h2>Date & Time</h2>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="startDate">Start Date *</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="admin-input"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="startTime">Start Time *</label>
            <input
              type="time"
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="admin-input"
            />
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="endDate">End Date *</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="admin-input"
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="endTime">End Time *</label>
            <input
              type="time"
              id="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="admin-input"
            />
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="timezone">Timezone</label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="admin-select"
            >
              {timezoneRegions.map((region) => (
                <optgroup key={region} label={region}>
                  {allTimezones
                    .filter((tz) => tz.region === region)
                    .map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.value.replace(`${region}/`, "").replace(/_/g, " ")}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="admin-form-group" />
        </div>
      </div>

      {/* Location Section */}
      <div className="admin-form-section">
        <h2>Location</h2>

        <div className="location-selector-row">
          <div className="admin-form-group">
            <label htmlFor="location">Location *</label>
            <LocationSelector
              locations={localLocations}
              value={selectedLocationId}
              onChange={setSelectedLocationId}
              onCreateNew={handleCreateNewLocation}
              placeholder="Select a location..."
            />
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-secondary location-create-btn"
            onClick={handleCreateNewLocation}
          >
            <i className="bx bx-plus"></i>
            Create new
          </button>
        </div>
      </div>

      {/* Venue Section */}
      <div className="admin-form-section">
        <h2>Venue</h2>
        <p className="admin-form-section-description">
          The hosting company or organization for this event.
        </p>

        <div className="admin-form-row">
          <label className="admin-radio-option">
            <input
              type="radio"
              name="venueMode"
              value="none"
              checked={venueMode === "none"}
              onChange={() => setVenueMode("none")}
            />
            <span>No venue</span>
          </label>
          <label className="admin-radio-option">
            <input
              type="radio"
              name="venueMode"
              value="existing"
              checked={venueMode === "existing"}
              onChange={() => setVenueMode("existing")}
            />
            <span>Select existing venue</span>
          </label>
          <label className="admin-radio-option">
            <input
              type="radio"
              name="venueMode"
              value="new"
              checked={venueMode === "new"}
              onChange={() => setVenueMode("new")}
            />
            <span>Create new venue</span>
          </label>
        </div>

        {venueMode === "existing" && (
          <div className="admin-form-group">
            <label htmlFor="venue">Venue</label>
            <select
              id="venue"
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="admin-select"
            >
              <option value="">Select a venue...</option>
              {venues.map((v) => (
                <option key={v.documentId} value={v.documentId}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {venueMode === "new" && (
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label htmlFor="newVenueName">Venue Name</label>
              <input
                type="text"
                id="newVenueName"
                value={newVenueName}
                onChange={(e) => setNewVenueName(e.target.value)}
                className="admin-input"
                placeholder="e.g., Tech Company Inc."
              />
            </div>
            <div className="admin-form-group">
              <label htmlFor="newVenueAddress">Address Details</label>
              <input
                type="text"
                id="newVenueAddress"
                value={newVenueAddress}
                onChange={(e) => setNewVenueAddress(e.target.value)}
                className="admin-input"
                placeholder="e.g., 123 Main Street"
              />
            </div>
          </div>
        )}
      </div>

      {/* Create Location Modal */}
      <CreateLocationModal
        isOpen={isCreateLocationModalOpen}
        onClose={() => setIsCreateLocationModalOpen(false)}
        onLocationCreated={handleLocationCreated}
      />
    </>
  )
}
