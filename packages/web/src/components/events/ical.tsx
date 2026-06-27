"use client"

import { createEvent, type EventAttributes } from "ics"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { anchorIcsToTimezone, zonedDateParts } from "@/libs/ical"
import { Enum_Event_Eventstatus, type Event } from "@/models/strapi"

const ICalendar = ({ event, asButton = false }: { event: Event; asButton?: boolean }) => {
  const t = useTranslations("events")
  const start = new Date(event.start)
  const end = new Date(event.end)
  const timezone = event.timezone || "UTC"

  // event.start/end are absolute UTC instants. Express them as the event's local
  // wall-clock time and emit as "local" (floating); the generated file is then
  // anchored to event.timezone (TZID + VTIMEZONE) in handleDownload so calendar
  // apps show the venue's local time, matching the on-site display.
  const evt: EventAttributes = {
    start: zonedDateParts(start, timezone),
    startInputType: "local",
    startOutputType: "local",
    end: zonedDateParts(end, timezone),
    endInputType: "local",
    endOutputType: "local",
    title: `#play14 - ${event.name}`,
    location: getLocation(event),
    categories: ["play", "learning by doing", "unconference"],
    status: getStatus(event),
  }

  // Only attach optional fields when valid — the ics validator rejects null,
  // empty strings, and scheme-less URLs, which would otherwise abort the whole
  // download with a validation error.
  if (event.description) {
    evt.htmlContent = event.description
  }
  const eventUrl = getUrl(event)
  if (eventUrl) {
    evt.url = eventUrl
  }

  const geoJSON = event.venue?.location
  if (geoJSON) {
    // Handle both Mapbox format (geometry.coordinates) and simple format (lat/lng)
    let longitude: number | undefined
    let latitude: number | undefined
    if ("geometry" in geoJSON && geoJSON.geometry?.coordinates) {
      longitude = geoJSON.geometry.coordinates[0]
      latitude = geoJSON.geometry.coordinates[1]
    } else if ("lng" in geoJSON && "lat" in geoJSON) {
      longitude = typeof geoJSON.lng === "number" ? geoJSON.lng : undefined
      latitude = typeof geoJSON.lat === "number" ? geoJSON.lat : undefined
    }
    if (latitude !== undefined && longitude !== undefined) {
      evt.geo = { lat: latitude, lon: longitude }
    }
  }
  if (event.contactEmail) {
    evt.organizer = { name: `#play14 ${event.name}`, email: event.contactEmail }
  }

  function getLocation(event: Event) {
    return event.venue
      ? `${event.venue.name}${event.venue.location ? " - " : ""}${
          event.venue.location ? event.venue.location.place_name : ""
        }`
      : t("noVenue")
  }

  function getUrl(event: Event): string | undefined {
    const website = event.venue?.website?.trim()
    if (!website) return undefined
    const withScheme = /^https?:\/\//i.test(website) ? website : `https://${website}`
    try {
      return new URL(withScheme).href
    } catch {
      return undefined
    }
  }

  function getStatus(event: Event) {
    return event.eventStatus === Enum_Event_Eventstatus.Cancelled
      ? "CANCELLED"
      : event.eventStatus === Enum_Event_Eventstatus.Announced
        ? "TENTATIVE"
        : "CONFIRMED"
  }

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault()

    try {
      const filename = `${event.name}.ics`
      const ics: string = await new Promise((resolve, reject) => {
        createEvent(evt, (error, value) => {
          if (error || !value) {
            reject(error ?? new Error("Failed to generate calendar event"))
            return
          }
          resolve(value)
        })
      })
      const file = new File([anchorIcsToTimezone(ics, timezone, start)], filename, {
        type: "text/calendar",
      })
      const url = URL.createObjectURL(file)

      // trying to assign the file URL to a window could cause cross-site
      // issues so this is a workaround using HTML5
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename

      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to download calendar event:", error)
      alert(t("details.calendarDownloadError"))
    }
  }

  if (asButton) {
    return (
      <Link
        href="#"
        onClick={handleDownload}
        className="event-profile-info__action-btn event-profile-info__action-btn--secondary"
        aria-label={t("details.addToCalendarLabel")}
      >
        <i className="bx bx-calendar" />
        {t("details.addToCalendar")}
      </Link>
    )
  }

  return (
    <Link href="#" onClick={handleDownload}>
      <i
        className="bx bx-calendar"
        title={t("details.addToCalendarLabel")}
        style={{ fontSize: "25px" }}
      />
    </Link>
  )
}

export default ICalendar
