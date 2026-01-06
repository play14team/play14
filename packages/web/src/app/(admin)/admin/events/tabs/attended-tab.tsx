"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { getMyAttendedEvents, type AttendedEvent } from "../events.action"
import { EventCard, EventFilterBar, EventsEmptyState, type BadgeType } from "../components"

interface AttendedTabProps {
  onCountChange?: (count: number) => void
}

export default function AttendedTab({ onCountChange }: AttendedTabProps) {
  const [events, setEvents] = useState<AttendedEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await getMyAttendedEvents()

    if (!result.success) {
      setError(result.error || "Failed to load attended events")
    } else {
      setEvents(result.events || [])
      onCountChange?.(result.events?.length || 0)
    }

    setIsLoading(false)
  }, [onCountChange])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Filter events based on search
  const filteredEvents = useMemo(() => {
    if (searchQuery.length < 2) return events

    const query = searchQuery.toLowerCase()
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.location?.name.toLowerCase().includes(query) ||
        e.location?.country?.toLowerCase().includes(query)
    )
  }, [events, searchQuery])

  // Build badges for each event (attendance source)
  const getBadges = (event: AttendedEvent): BadgeType[] => {
    return [{ type: "source", value: event.attendanceSource }]
  }

  if (isLoading) {
    return (
      <div className="claims-loading">
        <i className="bx bx-loader-alt bx-spin"></i>
        <span>Loading attended events...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="claims-error">
        <i className="bx bx-error-circle"></i>
        <p>{error}</p>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={fetchEvents}
        >
          <i className="bx bx-refresh"></i>
          Try Again
        </button>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <EventsEmptyState
        icon="bx-calendar-check"
        title="No Attended Events"
        message="You haven't attended any events yet."
        hint="Events you attend via tickets or approved claims will appear here."
        action={{
          label: "Browse Events",
          href: "/events",
          variant: "secondary",
        }}
      />
    )
  }

  return (
    <div className="events-list">
      <EventFilterBar
        searchEnabled
        searchPlaceholder="Search attended events..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filteredCount={filteredEvents.length}
        totalCount={events.length}
        countLabel="events attended"
      />

      {filteredEvents.length === 0 ? (
        <EventsEmptyState
          icon="bx-search-alt"
          title="No Events Found"
          message={`No events matching "${searchQuery}"`}
          action={{
            label: "Clear Search",
            onClick: () => setSearchQuery(""),
            variant: "secondary",
          }}
        />
      ) : (
        <div className="events-grid">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.documentId}
              event={{
                documentId: event.documentId,
                slug: event.slug,
                name: event.name,
                start: event.start,
                end: event.end,
                defaultImage: event.defaultImage,
                location: event.location,
              }}
              badges={getBadges(event)}
              action={{
                type: "link",
                label: "View Event",
                href: `/events/${event.slug}`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
