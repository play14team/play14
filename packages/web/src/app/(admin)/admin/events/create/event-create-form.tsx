"use client"

import { useToast } from "@/components/admin/toast"
import SimpleEditor from "@/components/ui/simple-editor"
import { TZDate } from "@date-fns/tz"
import { addDays, format, isAfter, isValid } from "date-fns"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  type EventCreateData,
  type LocationOption,
  type VenueOption,
  createEvent,
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
    const supported = timezones.includes("UTC") ? timezones : ["UTC", ...timezones]
    return supported.map((tz) => {
      const region = tz.split("/")[0]
      return { value: tz, region }
    })
  } catch {
    // Fallback for older browsers
    return [
      { value: "UTC", region: "UTC" },
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
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

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
  const [timezone, setTimezone] = useState("UTC")

  // Get all timezones from browser API
  const allTimezones = useMemo(() => getTimezones(), [])
  const timezoneRegions = useMemo(() => getTimezoneRegions(allTimezones), [allTimezones])
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("17:00")

  // Auto-calculate end date when start date changes (if end date not manually set)
  const [endDateManuallySet, setEndDateManuallySet] = useState(false)

  const parseDateTimeInput = (date: string, time: string, tz: string) => {
    const zone = tz || "UTC"
    if (!date || !time) return new TZDate(Number.NaN, zone)
    const [year, month, day] = date.split("-").map(Number)
    const [hour, minute] = time.split(":").map(Number)
    if ([year, month, day, hour, minute].some(Number.isNaN)) {
      return new TZDate(Number.NaN, zone)
    }
    return new TZDate(year, month - 1, day, hour, minute, 0, 0, zone)
  }

  // Calculate default end date based on start date
  useEffect(() => {
    if (!startDate || !startTime || endDateManuallySet) return

    const start = parseDateTimeInput(startDate, startTime, timezone)
    if (!isValid(start)) return

    const end = addDays(start, 2)

    // Format as YYYY-MM-DD for input
    setEndDate(format(end, "yyyy-MM-dd"))
    setEndTime("17:00")
  }, [startDate, startTime, endDateManuallySet, timezone])

  // Parse end date for preview display
  const endDatePreview = useMemo(() => {
    if (!endDate || !endTime) return null
    const end = parseDateTimeInput(endDate, endTime, timezone)
    if (!isValid(end)) return null
    return end
  }, [endDate, endTime, timezone])

  const startDatePreview = useMemo(() => {
    if (!startDate || !startTime) return null
    const start = parseDateTimeInput(startDate, startTime, timezone)
    if (!isValid(start)) return null
    return start
  }, [startDate, startTime, timezone])

  const formatDate = (date: TZDate) => format(date, "EEEE, MMMM d, yyyy")
  const formatTime = (date: TZDate) => format(date, "HH:mm")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Build the start datetime
    const startDateTime = parseDateTimeInput(startDate, startTime, timezone)
    if (!isValid(startDateTime)) {
      toast.error("Invalid start date/time")
      setIsSubmitting(false)
      return
    }

    // Build the end datetime
    const endDateTime = parseDateTimeInput(endDate, endTime, timezone)
    if (!isValid(endDateTime)) {
      toast.error("Invalid end date/time")
      setIsSubmitting(false)
      return
    }

    // Validate end is after start
    if (!isAfter(endDateTime, startDateTime)) {
      toast.error("End date/time must be after start date/time")
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
        toast.error("Please select a location")
        setIsSubmitting(false)
        return
      }
      data.locationId = selectedLocationId
    } else {
      if (!newLocationName.trim() || !newLocationCountry) {
        toast.error("Please provide location name and country")
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
      toast.success("Event created successfully!")
      // Redirect to the event edit page
      router.push(`/admin/events/${result.event.slug}`)
    } else {
      toast.error(result.error || "Failed to create event")
    }

    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form">
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
            <p className="admin-form-help">Auto-calculated as start + 2 days, but can be changed</p>
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

        {endDatePreview && startDatePreview && (
          <div className="end-date-preview">
            <i className="bx bx-calendar-check" />
            <span>
              Event runs from <strong>{formatDate(startDatePreview)}</strong> to{" "}
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
            <i className="bx bx-check" />
            Event will be created in &quot;Announced&quot; status (draft)
          </li>
          <li>
            <i className="bx bx-check" />
            Default schedule will be generated based on your start/end dates
          </li>
          <li>
            <i className="bx bx-check" />
            Two ticket types created: Early Bird and Standard (prices at 0)
          </li>
          <li>
            <i className="bx bx-check" />
            You will be added as a Host for this event
          </li>
        </ul>
      </div>

      <div className="admin-form-actions">
        <button
          type="submit"
          disabled={isSubmitting}
          className="admin-btn admin-btn-primary"
          data-save-shortcut
        >
          {isSubmitting ? (
            <>
              <i className="bx bx-loader-alt bx-spin" />
              Creating event...
            </>
          ) : (
            <>
              <i className="bx bx-calendar-plus" />
              Create Event
            </>
          )}
        </button>
      </div>
    </form>
  )
}
