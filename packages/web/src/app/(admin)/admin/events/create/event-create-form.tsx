"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import SimpleEditor from "@/components/ui/simple-editor"
import {
  createEvent,
  type LocationOption,
  type VenueOption,
  type EventCreateData,
} from "./event-create.action"

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

// Get all IANA timezones from the browser's Intl API, grouped by region
function getTimezones(): { value: string; region: string }[] {
  try {
    const timezones = Intl.supportedValuesOf("timeZone")
    return timezones.map((tz) => {
      const region = tz.split("/")[0]
      return { value: tz, region }
    })
  } catch {
    // Fallback for older browsers
    return [
      { value: "Europe/Paris", region: "Europe" },
      { value: "Europe/London", region: "Europe" },
      { value: "America/New_York", region: "America" },
      { value: "Asia/Tokyo", region: "Asia" },
    ]
  }
}

// Get unique regions sorted alphabetically
function getTimezoneRegions(timezones: { value: string; region: string }[]): string[] {
  const regions = [...new Set(timezones.map((tz) => tz.region))]
  return regions.sort()
}

interface Props {
  locations: LocationOption[]
  venues: VenueOption[]
}

export default function EventCreateForm({ locations, venues }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("18:00")
  const [locationMode, setLocationMode] = useState<"existing" | "new">("existing")
  const [selectedLocationId, setSelectedLocationId] = useState("")
  const [newLocationName, setNewLocationName] = useState("")
  const [newLocationCountry, setNewLocationCountry] = useState("")
  const [venueMode, setVenueMode] = useState<"existing" | "new" | "none">("none")
  const [selectedVenueId, setSelectedVenueId] = useState("")
  const [newVenueName, setNewVenueName] = useState("")
  const [newVenueAddress, setNewVenueAddress] = useState("")
  const [description, setDescription] = useState("")
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris"
  )

  // Get all timezones from browser API
  const allTimezones = useMemo(() => getTimezones(), [])
  const timezoneRegions = useMemo(
    () => getTimezoneRegions(allTimezones),
    [allTimezones]
  )
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("17:00")

  // Auto-calculate end date when start date changes (if end date not manually set)
  const [endDateManuallySet, setEndDateManuallySet] = useState(false)

  // Calculate default end date based on start date
  useEffect(() => {
    if (!startDate || !startTime || endDateManuallySet) return

    const start = new Date(`${startDate}T${startTime}:00`)
    if (isNaN(start.getTime())) return

    const end = new Date(start)
    end.setDate(end.getDate() + 2)

    // Format as YYYY-MM-DD for input
    const year = end.getFullYear()
    const month = String(end.getMonth() + 1).padStart(2, "0")
    const day = String(end.getDate()).padStart(2, "0")
    setEndDate(`${year}-${month}-${day}`)
    setEndTime("17:00")
  }, [startDate, startTime, endDateManuallySet])

  // Parse end date for preview display
  const endDatePreview = useMemo(() => {
    if (!endDate || !endTime) return null
    const end = new Date(`${endDate}T${endTime}:00`)
    if (isNaN(end.getTime())) return null
    return end
  }, [endDate, endTime])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

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
    const data: EventCreateData = {
      name: name.trim(),
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      timezone,
      description: description || undefined,
    }

    // Handle location
    if (locationMode === "existing") {
      if (!selectedLocationId) {
        setError("Please select a location")
        setIsSubmitting(false)
        return
      }
      data.locationId = selectedLocationId
    } else {
      if (!newLocationName.trim() || !newLocationCountry) {
        setError("Please provide location name and country")
        setIsSubmitting(false)
        return
      }
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

    const result = await createEvent(data)

    if (result.success && result.event) {
      // Redirect to the event edit page
      router.push(`/admin/events/${result.event.slug}`)
    } else {
      setError(result.error || "Failed to create event")
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

      <div className="admin-form-section">
        <h2>Event Details</h2>

        <div className="admin-form-group">
          <label htmlFor="name">Event Name *</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="admin-input"
            placeholder="e.g., #play14 Nancy"
          />
          <p className="admin-form-help">
            The event name will be used to generate a unique URL slug
          </p>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label htmlFor="startDate">Start Date *</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setEndDateManuallySet(false) // Reset manual flag to recalculate
              }}
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
              onChange={(e) => {
                setEndDate(e.target.value)
                setEndDateManuallySet(true)
              }}
              required
              className="admin-input"
            />
            <p className="admin-form-help">
              Auto-calculated as start + 2 days, but can be changed
            </p>
          </div>

          <div className="admin-form-group">
            <label htmlFor="endTime">End Time *</label>
            <input
              type="time"
              id="endTime"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value)
                setEndDateManuallySet(true)
              }}
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

        {endDatePreview && startDate && (
          <div className="end-date-preview">
            <i className="bx bx-calendar-check"></i>
            <span>
              Event runs from <strong>{formatDate(new Date(`${startDate}T${startTime}:00`))}</strong> to{" "}
              <strong>{formatDate(endDatePreview)}</strong> at{" "}
              <strong>{formatTime(endDatePreview)}</strong>
            </span>
          </div>
        )}
      </div>


      <div className="admin-form-section">
        <h2>Location *</h2>

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
              required={locationMode === "existing"}
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
                required={locationMode === "new"}
              />
            </div>
            <div className="admin-form-group">
              <label htmlFor="newLocationCountry">Country</label>
              <select
                id="newLocationCountry"
                value={newLocationCountry}
                onChange={(e) => setNewLocationCountry(e.target.value)}
                className="admin-select"
                required={locationMode === "new"}
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

      <div className="admin-form-section">
        <h2>Venue (Optional)</h2>
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
            <span>No venue yet</span>
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

      <div className="admin-form-section">
        <h2>Description (Optional)</h2>

        <div className="admin-form-group">
          <SimpleEditor
            content={description}
            onChange={setDescription}
            placeholder="Add a description for this event..."
          />
        </div>
      </div>

      <div className="admin-form-section admin-info-section">
        <h2>What happens next?</h2>
        <ul>
          <li>
            <i className="bx bx-check"></i>
            Event will be created in &quot;Announced&quot; status (draft)
          </li>
          <li>
            <i className="bx bx-check"></i>
            Default schedule will be generated based on your start/end dates
          </li>
          <li>
            <i className="bx bx-check"></i>
            Two ticket types created: Early Bird and Standard (prices at 0)
          </li>
          <li>
            <i className="bx bx-check"></i>
            You will be added as a Host for this event
          </li>
        </ul>
      </div>

      <div className="admin-form-actions">
        <button
          type="submit"
          disabled={isSubmitting}
          className="admin-btn admin-btn-primary"
        >
          {isSubmitting ? (
            <>
              <i className="bx bx-loader-alt bx-spin"></i>
              Creating event...
            </>
          ) : (
            <>
              <i className="bx bx-calendar-plus"></i>
              Create Event
            </>
          )}
        </button>
      </div>
    </form>
  )
}
