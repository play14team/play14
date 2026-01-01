"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import SimpleEditor from "@/components/ui/simple-editor"
import {
  updateEvent,
  type EventForEdit,
  type LocationOption,
  type VenueOption,
  type OrganizerOption,
  type EventUpdateData,
} from "./event-edit.action"
import TicketTypeEditor from "./ticket-type-editor"
import type { TicketType } from "./ticket-type.action"
import type {
  StripeAccountStatus,
  HostStripeAccount,
} from "@/app/(admin)/admin/stripe/stripe-connect.action"
import StripeAccountSelector from "@/components/admin/stripe-account-selector"

// Common European countries for the dropdown
const COUNTRIES = [
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "DE", name: "Germany" },
  { code: "ES", name: "Spain" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "IT", name: "Italy" },
  { code: "LU", name: "Luxembourg" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "US", name: "United States" },
]

const EVENT_STATUSES = [
  { value: "Announced", label: "Announced (Draft)" },
  { value: "Open", label: "Open (Registration Open)" },
  { value: "Over", label: "Over (Event Finished)" },
  { value: "Cancelled", label: "Cancelled" },
]

// Get all IANA timezones from the browser's Intl API
function getTimezones(): { value: string; region: string }[] {
  try {
    const timezones = Intl.supportedValuesOf("timeZone")
    return timezones.map((tz) => {
      const region = tz.split("/")[0]
      return { value: tz, region }
    })
  } catch {
    return [
      { value: "Europe/Paris", region: "Europe" },
      { value: "Europe/London", region: "Europe" },
      { value: "America/New_York", region: "America" },
      { value: "Asia/Tokyo", region: "Asia" },
    ]
  }
}

function getTimezoneRegions(
  timezones: { value: string; region: string }[]
): string[] {
  const regions = [...new Set(timezones.map((tz) => tz.region))]
  return regions.sort()
}

// Helper to format ISO date to local date input value (YYYY-MM-DD)
function formatDateForInput(isoString: string): string {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper to format ISO date to local time input value (HH:mm)
function formatTimeForInput(isoString: string): string {
  const date = new Date(isoString)
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

interface Props {
  event: EventForEdit
  locations: LocationOption[]
  venues: VenueOption[]
  organizers: OrganizerOption[]
  hostAccounts: HostStripeAccount[]
  playerStripeAccount: StripeAccountStatus | null
}

export default function EventEditForm({
  event,
  locations,
  venues,
  organizers,
  hostAccounts,
  playerStripeAccount,
}: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state - Event Details
  const [name, setName] = useState(event.name)
  const [eventStatus, setEventStatus] = useState(event.eventStatus)
  const [tagline, setTagline] = useState(event.tagline || "")
  const [description, setDescription] = useState(event.description || "")
  const [contactEmail, setContactEmail] = useState(event.contactEmail || "")

  // Form state - Date & Time
  const [startDate, setStartDate] = useState(formatDateForInput(event.start))
  const [startTime, setStartTime] = useState(formatTimeForInput(event.start))
  const [endDate, setEndDate] = useState(formatDateForInput(event.end))
  const [endTime, setEndTime] = useState(formatTimeForInput(event.end))
  const [timezone, setTimezone] = useState(
    event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  // Form state - Location
  const [locationMode, setLocationMode] = useState<"existing" | "new">(
    event.location ? "existing" : "new"
  )
  const [selectedLocationId, setSelectedLocationId] = useState(
    event.location?.documentId || ""
  )
  const [newLocationName, setNewLocationName] = useState("")
  const [newLocationCountry, setNewLocationCountry] = useState("")

  // Form state - Venue
  const [venueMode, setVenueMode] = useState<"existing" | "new" | "none">(
    event.venue ? "existing" : "none"
  )
  const [selectedVenueId, setSelectedVenueId] = useState(
    event.venue?.documentId || ""
  )
  const [newVenueName, setNewVenueName] = useState("")
  const [newVenueAddress, setNewVenueAddress] = useState("")

  // Form state - Organizers
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>(
    event.hosts?.map((h) => h.documentId) || []
  )
  const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>(
    event.mentors?.map((m) => m.documentId) || []
  )

  // Timezone helpers
  const allTimezones = useMemo(() => getTimezones(), [])
  const timezoneRegions = useMemo(
    () => getTimezoneRegions(allTimezones),
    [allTimezones]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    // Build the start datetime
    const startDateTime = new Date(`${startDate}T${startTime}:00`)
    if (isNaN(startDateTime.getTime())) {
      setError("Invalid start date/time")
      setIsSubmitting(false)
      return
    }

    // Build the end datetime
    const endDateTime = new Date(`${endDate}T${endTime}:00`)
    if (isNaN(endDateTime.getTime())) {
      setError("Invalid end date/time")
      setIsSubmitting(false)
      return
    }

    // Validate end is after start
    if (endDateTime <= startDateTime) {
      setError("End date/time must be after start date/time")
      setIsSubmitting(false)
      return
    }

    // Build request data
    const data: EventUpdateData = {
      name: name.trim(),
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      timezone,
      eventStatus,
      tagline: tagline.trim() || undefined,
      description: description || undefined,
      contactEmail: contactEmail.trim() || undefined,
    }

    // Handle location
    if (locationMode === "existing") {
      if (selectedLocationId) {
        data.locationId = selectedLocationId
      }
    } else if (newLocationName.trim() && newLocationCountry) {
      data.newLocation = {
        name: newLocationName.trim(),
        country: newLocationCountry,
      }
    }

    // Handle venue
    if (venueMode === "existing" && selectedVenueId) {
      data.venueId = selectedVenueId
    } else if (venueMode === "new" && newVenueName.trim()) {
      data.newVenue = {
        name: newVenueName.trim(),
        addressDetails: newVenueAddress.trim() || undefined,
      }
    }

    // Include organizers
    data.hostIds = selectedHostIds
    data.mentorIds = selectedMentorIds

    const result = await updateEvent(event.slug, data)

    if (result.success) {
      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } else {
      setError(result.error || "Failed to update event")
    }

    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      {error && (
        <div className="admin-alert admin-alert-error">
          <i className="bx bx-error-circle"></i>
          {error}
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success">
          <i className="bx bx-check-circle"></i>
          Event updated successfully!
        </div>
      )}

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

        <div className="admin-form-row">
          <label className="admin-radio-option">
            <input
              type="radio"
              name="locationMode"
              value="existing"
              checked={locationMode === "existing"}
              onChange={() => setLocationMode("existing")}
            />
            <span>Select existing location</span>
          </label>
          <label className="admin-radio-option">
            <input
              type="radio"
              name="locationMode"
              value="new"
              checked={locationMode === "new"}
              onChange={() => setLocationMode("new")}
            />
            <span>Create new location</span>
          </label>
        </div>

        {locationMode === "existing" ? (
          <div className="admin-form-group">
            <label htmlFor="location">Location</label>
            <select
              id="location"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="admin-select"
            >
              <option value="">Select a location...</option>
              {locations.map((loc) => (
                <option key={loc.documentId} value={loc.documentId}>
                  {loc.name} ({loc.country})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label htmlFor="newLocationName">Location Name</label>
              <input
                type="text"
                id="newLocationName"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                className="admin-input"
                placeholder="e.g., Nancy"
              />
            </div>
            <div className="admin-form-group">
              <label htmlFor="newLocationCountry">Country</label>
              <select
                id="newLocationCountry"
                value={newLocationCountry}
                onChange={(e) => setNewLocationCountry(e.target.value)}
                className="admin-select"
              >
                <option value="">Select country...</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
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

      {/* Description Section */}
      <div className="admin-form-section">
        <h2>Description</h2>

        <div className="admin-form-group">
          <SimpleEditor
            content={description}
            onChange={setDescription}
            placeholder="Add a description for this event..."
          />
        </div>
      </div>

      {/* Timetable Preview Section */}
      {event.timetable && event.timetable.length > 0 && (
        <div className="admin-form-section admin-info-section">
          <h2>Schedule Preview</h2>
          <div className="timetable-preview">
            {event.timetable.map((day, dayIndex) => (
              <div key={dayIndex} className="timetable-day">
                <h3>
                  {day.day} - {day.description}
                </h3>
                <ul>
                  {day.timeslots?.map((slot, slotIndex) => (
                    <li key={slotIndex}>
                      <strong>{slot.time.substring(0, 5)}</strong> -{" "}
                      {slot.description}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="admin-form-help">
            To modify the schedule in detail, use the Strapi admin panel.
          </p>
        </div>
      )}

      {/* Payment Settings Section */}
      <div className="admin-form-section">
        <h2>Payment Settings</h2>
        <p className="admin-form-section-description">
          Connect a Stripe account to receive payments from attendees.
        </p>
        <StripeAccountSelector
          eventId={event.documentId}
          currentAccount={event.stripeAccount}
          hostAccounts={hostAccounts}
          playerAccount={playerStripeAccount}
          onUpdate={() => router.refresh()}
        />
      </div>

      {/* Ticket Types Section */}
      <div className="admin-form-section">
        <h2>Ticket Types</h2>
        <p className="admin-form-section-description">
          Configure ticket types and pricing for this event.
        </p>
        <TicketTypeEditor
          eventId={event.documentId}
          ticketTypes={(event.ticketTypes || []) as TicketType[]}
          onUpdate={() => router.refresh()}
        />
      </div>

      {/* Organizers Section */}
      <div className="admin-form-section">
        <h2>Organizers</h2>
        <p className="admin-form-section-description">
          Add hosts and mentors to help organize this event.
        </p>

        {/* Hosts */}
        <div className="admin-form-group">
          <label>Hosts</label>
          <div className="organizer-selector">
            <select
              className="admin-select"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedHostIds([...selectedHostIds, e.target.value])
                }
              }}
            >
              <option value="">Add a host...</option>
              {organizers
                .filter((o) => !selectedHostIds.includes(o.documentId))
                .map((o) => (
                  <option key={o.documentId} value={o.documentId}>
                    {o.name}
                  </option>
                ))}
            </select>
            {selectedHostIds.length > 0 && (
              <ul className="organizer-list">
                {selectedHostIds.map((id) => {
                  const host =
                    organizers.find((o) => o.documentId === id) ||
                    event.hosts?.find((h) => h.documentId === id)
                  return (
                    <li key={id} className="organizer-item">
                      <span>{host?.name || id}</span>
                      <button
                        type="button"
                        className="organizer-remove"
                        onClick={() =>
                          setSelectedHostIds(
                            selectedHostIds.filter((hId) => hId !== id)
                          )
                        }
                        title="Remove host"
                      >
                        <i className="bx bx-x"></i>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Mentors */}
        <div className="admin-form-group">
          <label>Mentors</label>
          <div className="organizer-selector">
            <select
              className="admin-select"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedMentorIds([...selectedMentorIds, e.target.value])
                }
              }}
            >
              <option value="">Add a mentor...</option>
              {organizers
                .filter(
                  (o) =>
                    (o.position === "Mentor" || o.position === "Founder") &&
                    !selectedMentorIds.includes(o.documentId)
                )
                .map((o) => (
                  <option key={o.documentId} value={o.documentId}>
                    {o.name}
                  </option>
                ))}
            </select>
            {selectedMentorIds.length > 0 && (
              <ul className="organizer-list">
                {selectedMentorIds.map((id) => {
                  const mentor =
                    organizers.find((o) => o.documentId === id) ||
                    event.mentors?.find((m) => m.documentId === id)
                  return (
                    <li key={id} className="organizer-item">
                      <span>{mentor?.name || id}</span>
                      <button
                        type="button"
                        className="organizer-remove"
                        onClick={() =>
                          setSelectedMentorIds(
                            selectedMentorIds.filter((mId) => mId !== id)
                          )
                        }
                        title="Remove mentor"
                      >
                        <i className="bx bx-x"></i>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="admin-form-actions">
        <button
          type="submit"
          disabled={isSubmitting}
          className="admin-btn admin-btn-primary"
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

        <Link
          href={`/events/${event.slug}`}
          className="admin-btn admin-btn-secondary"
          target="_blank"
        >
          <i className="bx bx-link-external"></i>
          View Public Page
        </Link>
      </div>
    </form>
  )
}
