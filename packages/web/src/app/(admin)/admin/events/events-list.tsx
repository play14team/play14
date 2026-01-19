"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { publishEvent, unpublishEvent } from "./[slug]/event-edit.action"
import { type MyEvent, getMyEvents } from "./events.action"

type StatusFilter = "active" | "all" | "drafts" | "over" | "cancelled"

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "drafts", label: "Drafts" },
  { value: "all", label: "All" },
  { value: "over", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
]

function formatEventDate(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }

  const startStr = startDate.toLocaleDateString("en-US", options)
  const endStr = endDate.toLocaleDateString("en-US", options)

  // If same year, don't repeat year in start date
  if (startDate.getFullYear() === endDate.getFullYear()) {
    const startShort = startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    return `${startShort} - ${endStr}`
  }

  return `${startStr} - ${endStr}`
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Open":
      return "event-status-open"
    case "Announced":
      return "event-status-announced"
    case "Over":
      return "event-status-over"
    case "Cancelled":
      return "event-status-cancelled"
    default:
      return ""
  }
}

export default function EventsList() {
  const [events, setEvents] = useState<MyEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [publishingSlug, setPublishingSlug] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getMyEvents()
      setEvents(result)
    } catch {
      setError("Failed to fetch events")
    }

    setIsLoading(false)
  }, [])

  const handlePublishToggle = async (e: React.MouseEvent, event: MyEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setPublishingSlug(event.slug)

    const result = event.isPublished
      ? await unpublishEvent(event.slug)
      : await publishEvent(event.slug)

    if (result.success) {
      // Update local state
      setEvents((prev) =>
        prev.map((ev) => (ev.slug === event.slug ? { ...ev, isPublished: !ev.isPublished } : ev))
      )
    }

    setPublishingSlug(null)
  }

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Filter events based on status
  const filteredEvents = useMemo(() => {
    switch (statusFilter) {
      case "active":
        return events.filter((e) => e.eventStatus === "Announced" || e.eventStatus === "Open")
      case "drafts":
        return events.filter((e) => !e.isPublished)
      case "over":
        return events.filter((e) => e.eventStatus === "Over")
      case "cancelled":
        return events.filter((e) => e.eventStatus === "Cancelled")
      default:
        return events
    }
  }, [events, statusFilter])

  // Count drafts for badge
  const draftCount = useMemo(() => events.filter((e) => !e.isPublished).length, [events])

  if (isLoading) {
    return (
      <div className="claims-loading">
        <i className="bx bx-loader-alt bx-spin" />
        <span>Loading events...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="claims-error">
        <i className="bx bx-error-circle" />
        <p>{error}</p>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={fetchEvents}>
          <i className="bx bx-refresh" />
          Try Again
        </button>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="claims-empty">
        <div className="claims-empty-icon">
          <i className="bx bx-calendar-event" />
        </div>
        <h3>No Events Yet</h3>
        <p>You haven&apos;t created any events yet.</p>
        <Link href="/admin/events/create" className="admin-btn admin-btn-primary">
          <i className="bx bx-plus" />
          Create Your First Event
        </Link>
      </div>
    )
  }

  return (
    <div className="events-list">
      <div className="events-toolbar">
        <div className="events-filter-tabs">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`events-filter-tab ${statusFilter === filter.value ? "active" : ""}`}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
              {filter.value === "drafts" && draftCount > 0 && (
                <span className="filter-tab-badge">{draftCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="events-count">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
          {statusFilter !== "all" && ` (${events.length} total)`}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="events-empty-filter">
          <i className="bx bx-filter-alt" />
          <p>No {statusFilter === "active" ? "active" : statusFilter} events found.</p>
          {statusFilter !== "all" && (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => setStatusFilter("all")}
            >
              Show All Events
            </button>
          )}
        </div>
      ) : (
        <div className="events-grid">
          {filteredEvents.map((event) => (
            <div key={event.documentId} className="event-card-wrapper">
              <Link href={`/admin/events/${event.slug}`} className="event-card">
                <div className="event-card-header">
                  <h3 className="event-card-name">{event.name}</h3>
                  <div className="event-card-badges">
                    {!event.isPublished && (
                      <span className="event-badge event-badge-draft">Draft</span>
                    )}
                    <span
                      className={`event-badge event-badge-status ${getStatusColor(event.eventStatus)}`}
                    >
                      {event.eventStatus}
                    </span>
                  </div>
                </div>

                <div className="event-card-meta">
                  {event.location && (
                    <span className="event-card-location">
                      <i className="bx bx-map" />
                      {event.location.name}, {event.location.country}
                    </span>
                  )}
                  <span className="event-card-dates">
                    <i className="bx bx-calendar" />
                    {formatEventDate(event.start, event.end)}
                  </span>
                </div>

                <div className="event-card-action">
                  <span>Edit Event</span>
                  <i className="bx bx-chevron-right" />
                </div>
              </Link>

              <div className="event-card-quick-actions">
                <Link
                  href={`/admin/events/${event.slug}/preview`}
                  className="event-quick-btn"
                  title="Preview event"
                >
                  <i className="bx bx-show" />
                </Link>
                <button
                  type="button"
                  className={`event-quick-btn ${event.isPublished ? "published" : "draft"}`}
                  onClick={(e) => handlePublishToggle(e, event)}
                  disabled={publishingSlug === event.slug}
                  title={event.isPublished ? "Unpublish event" : "Publish event"}
                >
                  {publishingSlug === event.slug ? (
                    <i className="bx bx-loader-alt bx-spin" />
                  ) : event.isPublished ? (
                    <i className="bx bx-hide" />
                  ) : (
                    <i className="bx bx-globe" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
