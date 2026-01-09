"use client"

import { useState, useMemo } from "react"
import countries from "i18n-iso-countries"
import en from "i18n-iso-countries/langs/en.json"
import type {
  EventForEdit,
  EventUpdateData,
  TicketingMode,
} from "../event-edit.action"
import type { Sponsorship } from "../sponsor.action"
import type { TimetableDay } from "../schedule.types"
import type { MediaLink } from "../media-links.action"
import type { FinanceData } from "../finance.action"
import type { MapLocation } from "@/components/admin/location-map-picker"

// Register English locale for country names
countries.registerLocale(en)

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

// Get all countries from i18n-iso-countries, sorted alphabetically
export function getAllCountries(): { code: string; name: string }[] {
  const countryNames = countries.getNames("en")
  return Object.entries(countryNames)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Helper to get country name by code
export function getCountryName(code: string): string {
  return countries.getName(code, "en") || code
}

export const EVENT_STATUSES = [
  { value: "Announced", label: "Announced (Draft)" },
  { value: "Open", label: "Open (Registration Open)" },
  { value: "Over", label: "Over (Event Finished)" },
  { value: "Cancelled", label: "Cancelled" },
]

// Get ticketing mode from event data (now stored directly)
function getTicketingModeFromEvent(event: EventForEdit): TicketingMode {
  return event.ticketingMode || "none"
}

/** All trackable form values for dirty state detection */
export interface EventFormValues {
  name: string
  eventStatus: string
  tagline: string
  description: string
  contactEmail: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  timezone: string
  locationMode: "existing" | "new"
  selectedLocationId: string
  newLocationName: string
  newLocationCountry: string
  newLocationMapLocation: MapLocation | null
  venueMode: "existing" | "new" | "none"
  selectedVenueId: string
  newVenueName: string
  newVenueAddress: string
  selectedHostIds: string[]
  selectedMentorIds: string[]
  ticketingMode: TicketingMode
  registrationLink: string
  registrationWidgetCode: string
  sponsorships: Sponsorship[]
  schedule: TimetableDay[]
  mediaLinks: MediaLink[]
  financeData: FinanceData | null
}

export interface UseEventFormReturn {
  // Form state - Event Details
  name: string
  setName: (value: string) => void
  eventStatus: string
  setEventStatus: (value: string) => void
  tagline: string
  setTagline: (value: string) => void
  description: string
  setDescription: (value: string) => void
  contactEmail: string
  setContactEmail: (value: string) => void

  // Form state - Date & Time
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

  // Timezone helpers
  allTimezones: { value: string; region: string }[]
  timezoneRegions: string[]

  // Form state - Location
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

  // Form state - Venue
  venueMode: "existing" | "new" | "none"
  setVenueMode: (value: "existing" | "new" | "none") => void
  selectedVenueId: string
  setSelectedVenueId: (value: string) => void
  newVenueName: string
  setNewVenueName: (value: string) => void
  newVenueAddress: string
  setNewVenueAddress: (value: string) => void

  // Form state - Organizers
  selectedHostIds: string[]
  setSelectedHostIds: (value: string[]) => void
  selectedMentorIds: string[]
  setSelectedMentorIds: (value: string[]) => void

  // Form state - Ticketing
  ticketingMode: TicketingMode
  setTicketingMode: (value: TicketingMode) => void
  registrationLink: string
  setRegistrationLink: (value: string) => void
  registrationWidgetCode: string
  setRegistrationWidgetCode: (value: string) => void

  // Form state - Sponsorships
  sponsorships: Sponsorship[]
  setSponsorships: (value: Sponsorship[]) => void

  // Form state - Schedule
  schedule: TimetableDay[]
  setSchedule: (value: TimetableDay[]) => void

  // Form state - Media Links
  mediaLinks: MediaLink[]
  setMediaLinks: (value: MediaLink[]) => void

  // Form state - Finance
  financeData: FinanceData | null
  setFinanceData: (value: FinanceData | null) => void

  // Dirty state tracking
  formValues: EventFormValues

  // Original form values (for resetting dirty state baseline)
  originalFormValues: EventFormValues

  // Build data for submission
  buildSubmitData: () => { data: EventUpdateData | null; error: string | null }

  // Reset form to original values
  resetForm: () => void
}

export function useEventForm(event: EventForEdit): UseEventFormReturn {
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
  const [newLocationMapLocation, setNewLocationMapLocation] = useState<MapLocation | null>(null)

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

  // Form state - Ticketing
  const [ticketingMode, setTicketingMode] = useState<TicketingMode>(
    getTicketingModeFromEvent(event)
  )
  const [registrationLink, setRegistrationLink] = useState(
    event.registration?.link || ""
  )
  const [registrationWidgetCode, setRegistrationWidgetCode] = useState(
    event.registration?.widgetCode || ""
  )

  // Form state - Sponsorships (transform to match Sponsorship type)
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>(
    (event.sponsorships || []).map((s) => ({
      id: s.id,
      category: s.category,
      sponsors: s.sponsors.map((sp) => ({
        documentId: sp.documentId,
        name: sp.name,
        url: sp.url,
        logo: sp.logo,
      })),
    }))
  )

  // Form state - Schedule
  const [schedule, setSchedule] = useState<TimetableDay[]>(event.timetable || [])

  // Form state - Media Links
  const [mediaLinks, setMediaLinks] = useState<MediaLink[]>(
    (event.media || []).map((m) => ({
      id: m.id,
      url: m.url,
      type: m.type,
    }))
  )

  // Form state - Finance
  const [financeData, setFinanceData] = useState<FinanceData | null>(
    event.finance
      ? {
          revenue: event.finance.revenue,
          expenses: event.finance.expenses,
          destination: event.finance.destination,
        }
      : null
  )

  // Timezone helpers
  const allTimezones = useMemo(() => getTimezones(), [])
  const timezoneRegions = useMemo(
    () => getTimezoneRegions(allTimezones),
    [allTimezones]
  )

  // Original form values (stable reference for dirty state reset)
  const originalFormValues = useMemo<EventFormValues>(
    () => ({
      name: event.name,
      eventStatus: event.eventStatus,
      tagline: event.tagline || "",
      description: event.description || "",
      contactEmail: event.contactEmail || "",
      startDate: formatDateForInput(event.start),
      startTime: formatTimeForInput(event.start),
      endDate: formatDateForInput(event.end),
      endTime: formatTimeForInput(event.end),
      timezone: event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      locationMode: event.location ? "existing" : "new",
      selectedLocationId: event.location?.documentId || "",
      newLocationName: "",
      newLocationCountry: "",
      newLocationMapLocation: null,
      venueMode: event.venue ? "existing" : "none",
      selectedVenueId: event.venue?.documentId || "",
      newVenueName: "",
      newVenueAddress: "",
      selectedHostIds: event.hosts?.map((h) => h.documentId) || [],
      selectedMentorIds: event.mentors?.map((m) => m.documentId) || [],
      ticketingMode: getTicketingModeFromEvent(event),
      registrationLink: event.registration?.link || "",
      registrationWidgetCode: event.registration?.widgetCode || "",
      sponsorships: (event.sponsorships || []).map((s) => ({
        id: s.id,
        category: s.category,
        sponsors: s.sponsors.map((sp) => ({
          documentId: sp.documentId,
          name: sp.name,
          url: sp.url,
          logo: sp.logo,
        })),
      })),
      schedule: event.timetable || [],
      mediaLinks: (event.media || []).map((m) => ({
        id: m.id,
        url: m.url,
        type: m.type,
      })),
      financeData: event.finance
        ? {
            revenue: event.finance.revenue,
            expenses: event.finance.expenses,
            destination: event.finance.destination,
          }
        : null,
    }),
    [event]
  )

  // Build data for submission
  const buildSubmitData = (): {
    data: EventUpdateData | null
    error: string | null
  } => {
    // Build the start datetime
    const startDateTime = new Date(`${startDate}T${startTime}:00`)
    if (isNaN(startDateTime.getTime())) {
      return { data: null, error: "Invalid start date/time" }
    }

    // Build the end datetime
    const endDateTime = new Date(`${endDate}T${endTime}:00`)
    if (isNaN(endDateTime.getTime())) {
      return { data: null, error: "Invalid end date/time" }
    }

    // Validate end is after start
    if (endDateTime <= startDateTime) {
      return { data: null, error: "End date/time must be after start date/time" }
    }

    // Build request data
    // Note: Use null for optional string fields when empty to allow clearing them
    const data: EventUpdateData = {
      name: name.trim(),
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      timezone,
      eventStatus,
      tagline: tagline.trim() || null,
      description: description || null,
      contactEmail: contactEmail.trim() || null,
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
        location: newLocationMapLocation || undefined,
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

    // Include ticketing
    data.ticketingMode = ticketingMode
    if (ticketingMode === "external") {
      data.registration = {
        link: registrationLink.trim() || undefined,
        widgetCode: registrationWidgetCode.trim() || undefined,
      }
    }

    // Include sponsorships - transform to API format (only sponsor documentIds)
    data.sponsorships = sponsorships.map((s) => ({
      id: s.id,
      category: s.category,
      sponsors: s.sponsors.map((sp) => sp.documentId),
    }))

    // Include schedule
    data.schedule = schedule

    // Include media links
    data.mediaLinks = mediaLinks

    // Include finance data
    if (financeData) {
      data.finance = financeData
    }

    return { data, error: null }
  }

  // Reset form to original values from event prop
  const resetForm = () => {
    setName(event.name)
    setEventStatus(event.eventStatus)
    setTagline(event.tagline || "")
    setDescription(event.description || "")
    setContactEmail(event.contactEmail || "")
    setStartDate(formatDateForInput(event.start))
    setStartTime(formatTimeForInput(event.start))
    setEndDate(formatDateForInput(event.end))
    setEndTime(formatTimeForInput(event.end))
    setTimezone(event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
    setLocationMode(event.location ? "existing" : "new")
    setSelectedLocationId(event.location?.documentId || "")
    setNewLocationName("")
    setNewLocationCountry("")
    setNewLocationMapLocation(null)
    setVenueMode(event.venue ? "existing" : "none")
    setSelectedVenueId(event.venue?.documentId || "")
    setNewVenueName("")
    setNewVenueAddress("")
    setSelectedHostIds(event.hosts?.map((h) => h.documentId) || [])
    setSelectedMentorIds(event.mentors?.map((m) => m.documentId) || [])
    setTicketingMode(getTicketingModeFromEvent(event))
    setRegistrationLink(event.registration?.link || "")
    setRegistrationWidgetCode(event.registration?.widgetCode || "")
    setSponsorships(
      (event.sponsorships || []).map((s) => ({
        id: s.id,
        category: s.category,
        sponsors: s.sponsors.map((sp) => ({
          documentId: sp.documentId,
          name: sp.name,
          url: sp.url,
          logo: sp.logo,
        })),
      }))
    )
    setSchedule(event.timetable || [])
    setMediaLinks(
      (event.media || []).map((m) => ({
        id: m.id,
        url: m.url,
        type: m.type,
      }))
    )
    setFinanceData(
      event.finance
        ? {
            revenue: event.finance.revenue,
            expenses: event.finance.expenses,
            destination: event.finance.destination,
          }
        : null
    )
  }

  return {
    // Event Details
    name,
    setName,
    eventStatus,
    setEventStatus,
    tagline,
    setTagline,
    description,
    setDescription,
    contactEmail,
    setContactEmail,

    // Date & Time
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

    // Location
    locationMode,
    setLocationMode,
    selectedLocationId,
    setSelectedLocationId,
    newLocationName,
    setNewLocationName,
    newLocationCountry,
    setNewLocationCountry,
    newLocationMapLocation,
    setNewLocationMapLocation,

    // Venue
    venueMode,
    setVenueMode,
    selectedVenueId,
    setSelectedVenueId,
    newVenueName,
    setNewVenueName,
    newVenueAddress,
    setNewVenueAddress,

    // Organizers
    selectedHostIds,
    setSelectedHostIds,
    selectedMentorIds,
    setSelectedMentorIds,

    // Ticketing
    ticketingMode,
    setTicketingMode,
    registrationLink,
    setRegistrationLink,
    registrationWidgetCode,
    setRegistrationWidgetCode,

    // Sponsorships
    sponsorships,
    setSponsorships,

    // Schedule
    schedule,
    setSchedule,

    // Media Links
    mediaLinks,
    setMediaLinks,

    // Finance
    financeData,
    setFinanceData,

    // Form values for dirty state tracking
    formValues: {
      name,
      eventStatus,
      tagline,
      description,
      contactEmail,
      startDate,
      startTime,
      endDate,
      endTime,
      timezone,
      locationMode,
      selectedLocationId,
      newLocationName,
      newLocationCountry,
      newLocationMapLocation,
      venueMode,
      selectedVenueId,
      newVenueName,
      newVenueAddress,
      selectedHostIds,
      selectedMentorIds,
      ticketingMode,
      registrationLink,
      registrationWidgetCode,
      sponsorships,
      schedule,
      mediaLinks,
      financeData,
    },

    // Original form values (for resetting dirty state baseline)
    originalFormValues,

    // Submit
    buildSubmitData,

    // Reset
    resetForm,
  }
}
