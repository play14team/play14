"use client"

import { TZDate } from "@date-fns/tz"
import { format, isValid } from "date-fns"
import { useState } from "react"
import CreateLocationModal from "@/components/admin/create-location-modal"
import CreateVenueModal from "@/components/admin/create-venue-modal"
import type { MapLocation } from "@/components/admin/location-map-picker"
import LocationSelector from "@/components/admin/location-selector"
import VenueSelector from "@/components/admin/venue-selector"
import type { LocationOption, VenueOption } from "../event-edit.action"
import { EVENT_STATUSES } from "../hooks/use-event-form"

function formatEventDateSummary(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
  timezone: string
): string | null {
  if (!startDate || !startTime || !endDate || !endTime) return null

  const tz = timezone || "UTC"
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number)
  const [startHour, startMinute] = startTime.split(":").map(Number)
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number)
  const [endHour, endMinute] = endTime.split(":").map(Number)

  const start = new TZDate(startYear, startMonth - 1, startDay, startHour, startMinute, 0, 0, tz)
  const end = new TZDate(endYear, endMonth - 1, endDay, endHour, endMinute, 0, 0, tz)

  if (!isValid(start) || !isValid(end)) return null

  const startFormatted = format(start, "EEEE MMMM do 'at' HH:mm")
  const endFormatted = format(end, "EEEE MMMM do 'at' HH:mm")

  return `Event starts on ${startFormatted} and ends on ${endFormatted}`
}

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
  onVenueAdded?: (venue: VenueOption) => void
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
  setVenueMode,
  selectedVenueId,
  setSelectedVenueId,
  venues,
  onVenueAdded,
}: BasicsTabProps) {
  // Modal state for creating new location
  const [isCreateLocationModalOpen, setIsCreateLocationModalOpen] = useState(false)

  // Modal state for creating new venue
  const [isCreateVenueModalOpen, setIsCreateVenueModalOpen] = useState(false)

  // Local state for locations list (to add new locations without page refresh)
  const [localLocations, setLocalLocations] = useState<LocationOption[]>(locations)

  // Local state for venues list (to add new venues without page refresh)
  const [localVenues, setLocalVenues] = useState<VenueOption[]>(venues)

  const handleCreateNewLocation = () => {
    setIsCreateLocationModalOpen(true)
  }

  const handleLocationCreated = (newLocation: {
    documentId: string
    name: string
    country: string
  }) => {
    // Add the new location to the local list
    const locationOption: LocationOption = {
      documentId: newLocation.documentId,
      name: newLocation.name,
      country: newLocation.country,
    }
    setLocalLocations((prev) =>
      [...prev, locationOption].sort((a, b) => a.name.localeCompare(b.name))
    )

    // Select the newly created location
    setSelectedLocationId(newLocation.documentId)

    // Ensure we're in "existing" mode now that we have a location selected
    setLocationMode("existing")

    // Notify parent if callback provided
    onLocationAdded?.(locationOption)
  }

  const handleCreateNewVenue = () => {
    setIsCreateVenueModalOpen(true)
  }

  const handleVenueCreated = (newVenue: {
    documentId: string
    name: string
    addressDetails?: string
  }) => {
    // Add the new venue to the local list
    const venueOption: VenueOption = {
      documentId: newVenue.documentId,
      name: newVenue.name,
      addressDetails: newVenue.addressDetails,
    }
    setLocalVenues((prev) => [...prev, venueOption].sort((a, b) => a.name.localeCompare(b.name)))

    // Select the newly created venue
    setSelectedVenueId(newVenue.documentId)

    // Ensure we're in "existing" mode now that we have a venue selected
    setVenueMode("existing")

    // Notify parent if callback provided
    onVenueAdded?.(venueOption)
  }

  return (
    <>
      {/* Event Details Section */}
      <div className="admin-form-section">
        <h2>Event Details</h2>

        <div className="admin-form-row three-columns">
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
      </div>

      {/* Date & Time Section */}
      <div className="admin-form-section">
        <h2>Date & Time</h2>

        <div className="admin-form-row three-columns">
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

        {formatEventDateSummary(startDate, startTime, endDate, endTime, timezone) && (
          <p
            className="admin-form-section-description"
            style={{ marginTop: "16px", marginBottom: 0 }}
          >
            <i className="bx bx-calendar" style={{ marginRight: "8px" }} />
            {formatEventDateSummary(startDate, startTime, endDate, endTime, timezone)}
          </p>
        )}
      </div>

      {/* Location & Venue Section */}
      <div className="location-venue-row">
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
              <i className="bx bx-plus" />
              Create new
            </button>
          </div>
        </div>

        <div className="admin-form-section">
          <h2>Venue</h2>
          <p className="admin-form-section-description">
            The hosting company or organization for this event.
          </p>

          <div className="venue-selector-row">
            <div className="admin-form-group">
              <label htmlFor="venue">Venue</label>
              <VenueSelector
                venues={localVenues}
                value={selectedVenueId}
                onChange={(id) => {
                  setSelectedVenueId(id)
                  if (id) {
                    setVenueMode("existing")
                  } else {
                    setVenueMode("none")
                  }
                }}
                onCreateNew={handleCreateNewVenue}
                placeholder="Select a venue (optional)..."
              />
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-secondary venue-create-btn"
              onClick={handleCreateNewVenue}
            >
              <i className="bx bx-plus" />
              Create new
            </button>
          </div>

          {selectedVenueId && (
            <button
              type="button"
              className="admin-btn admin-btn-text venue-clear-btn"
              onClick={() => {
                setSelectedVenueId("")
                setVenueMode("none")
              }}
            >
              <i className="bx bx-x" />
              Clear venue selection
            </button>
          )}
        </div>
      </div>

      {/* Create Location Modal */}
      <CreateLocationModal
        isOpen={isCreateLocationModalOpen}
        onClose={() => setIsCreateLocationModalOpen(false)}
        onLocationCreated={handleLocationCreated}
      />

      {/* Create Venue Modal */}
      <CreateVenueModal
        isOpen={isCreateVenueModalOpen}
        onClose={() => setIsCreateVenueModalOpen(false)}
        onVenueCreated={handleVenueCreated}
      />
    </>
  )
}
