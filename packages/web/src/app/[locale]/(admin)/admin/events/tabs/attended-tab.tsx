"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useState } from "react"
import { type BadgeType, EventCard, EventFilterBar, EventsEmptyState } from "../components"
import { type AttendedEvent, getMyAttendedEvents } from "../events.action"

interface AttendedTabProps {
  onCountChange?: (count: number) => void
}

export default function AttendedTab({ onCountChange }: AttendedTabProps) {
  const t = useTranslations("adminEvents")
  const [events, setEvents] = useState<AttendedEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await getMyAttendedEvents()

    if (!result.success) {
      setError(result.error || t("list.failedToLoad"))
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
        <i className="bx bx-loader-alt bx-spin" />
        <span>{t("list.loadingAttendedEvents")}</span>
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
          {t("list.tryAgain")}
        </button>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <EventsEmptyState
        icon="bx-calendar-check"
        title={t("attended.noAttendedEvents")}
        message={t("attended.noAttendedMessage")}
        hint={t("attended.noAttendedHint")}
        action={{
          label: t("attended.browseEvents"),
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
        searchPlaceholder={t("search.searchAttendedEvents")}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filteredCount={filteredEvents.length}
        totalCount={events.length}
        countLabel={t("attended.eventsAttended")}
      />

      {filteredEvents.length === 0 ? (
        <EventsEmptyState
          icon="bx-search-alt"
          title={t("search.noEventsFound")}
          message={t("search.noEventsMatching", { query: searchQuery })}
          action={{
            label: t("search.clearSearch"),
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
                label: t("list.viewEvent"),
                href: `/events/${event.slug}`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
