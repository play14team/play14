"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { publishEvent, unpublishEvent } from "../[slug]/event-edit.action"
import {
  type BadgeType,
  EventCard,
  EventFilterBar,
  EventsEmptyState,
  type FilterOption,
} from "../components"
import { type MyEvent, getMyEvents } from "../events.action"

type StatusFilter = "mine" | "active" | "all" | "drafts" | "over"

const STATUS_FILTERS: FilterOption[] = [
  { value: "mine", label: "Mine" },
  { value: "active", label: "Active" },
  { value: "drafts", label: "Drafts" },
  { value: "over", label: "Past" },
  { value: "all", label: "All" },
]

interface OrganizedTabProps {
  onCountChange?: (count: number) => void
}

export default function OrganizedTab({ onCountChange }: OrganizedTabProps) {
  const [events, setEvents] = useState<MyEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("mine")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCancelled, setShowCancelled] = useState(false)
  const [publishingSlug, setPublishingSlug] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getMyEvents()
      setEvents(result)
      onCountChange?.(result.length)
    } catch {
      setError("Failed to fetch events")
    }

    setIsLoading(false)
  }, [onCountChange])

  const handlePublishToggle = async (e: React.MouseEvent, event: MyEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setPublishingSlug(event.slug)

    const result = event.isPublished
      ? await unpublishEvent(event.slug)
      : await publishEvent(event.slug)

    if (result.success) {
      setEvents((prev) =>
        prev.map((ev) => (ev.slug === event.slug ? { ...ev, isPublished: !ev.isPublished } : ev))
      )
    }

    setPublishingSlug(null)
  }

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Filter events based on status and search
  const filteredEvents = useMemo(() => {
    let result = events

    // Exclude cancelled events unless toggle is checked
    if (!showCancelled) {
      result = result.filter((e) => e.eventStatus !== "Cancelled")
    }

    // Apply status filter
    switch (statusFilter) {
      case "mine":
        result = result.filter((e) => e.isHost || e.isMentor)
        break
      case "active":
        result = result.filter((e) => e.eventStatus === "Announced" || e.eventStatus === "Open")
        break
      case "drafts":
        result = result.filter((e) => !e.isPublished)
        break
      case "over":
        result = result.filter((e) => e.eventStatus === "Over")
        break
    }

    // Apply search filter
    if (searchQuery.length >= 2) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.location?.name.toLowerCase().includes(query) ||
          e.location?.country?.toLowerCase().includes(query)
      )
    }

    return result
  }, [events, statusFilter, searchQuery, showCancelled])

  // Count drafts for badge
  const draftCount = useMemo(() => events.filter((e) => !e.isPublished).length, [events])

  // Add draft count to filters
  const filtersWithCounts = useMemo(
    () => STATUS_FILTERS.map((f) => (f.value === "drafts" ? { ...f, count: draftCount } : f)),
    [draftCount]
  )

  // Build badges for each event
  const getBadges = (event: MyEvent): BadgeType[] => {
    const badges: BadgeType[] = []
    if (!event.isPublished) {
      badges.push({ type: "draft" })
    }
    badges.push({ type: "status", value: event.eventStatus })
    return badges
  }

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
      <EventsEmptyState
        icon="bx-calendar-event"
        title="No Events Yet"
        message="You haven't created any events yet."
        action={{
          label: "Create Your First Event",
          href: "/admin/events/create",
          variant: "primary",
        }}
      />
    )
  }

  return (
    <div className="events-list">
      <EventFilterBar
        searchEnabled
        searchPlaceholder="Search events..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filtersWithCounts}
        activeFilter={statusFilter}
        onFilterChange={(v) => setStatusFilter(v as StatusFilter)}
        toggles={[
          {
            id: "show-cancelled",
            label: "Show cancelled",
            checked: showCancelled,
            onChange: setShowCancelled,
          },
        ]}
        filteredCount={filteredEvents.length}
        totalCount={events.length}
        countLabel="events"
      />

      {filteredEvents.length === 0 ? (
        <EventsEmptyState
          icon="bx-filter-alt"
          title="No Events Found"
          message={
            searchQuery
              ? `No events matching "${searchQuery}"`
              : statusFilter === "mine"
                ? "No events where you are host or mentor."
                : `No ${statusFilter === "active" ? "active" : statusFilter} events found.`
          }
          action={
            statusFilter !== "all" || searchQuery
              ? {
                  label: "Clear Filters",
                  onClick: () => {
                    setStatusFilter("all")
                    setSearchQuery("")
                  },
                  variant: "secondary",
                }
              : undefined
          }
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
                eventStatus: event.eventStatus,
                isPublished: event.isPublished,
                defaultImage: event.defaultImage,
                location: event.location,
              }}
              badges={getBadges(event)}
              action={{
                type: "link",
                label: "Edit Event",
                href: `/admin/events/${event.slug}`,
              }}
              quickActions={[
                {
                  icon: "bx-show",
                  title: "Preview event",
                  href: `/admin/events/${event.slug}/preview`,
                },
                {
                  icon: event.isPublished ? "bx-hide" : "bx-globe",
                  title: event.isPublished ? "Unpublish event" : "Publish event",
                  onClick: (e) => handlePublishToggle(e, event),
                  disabled: publishingSlug === event.slug,
                  loading: publishingSlug === event.slug,
                  variant: event.isPublished ? "published" : "draft",
                },
              ]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
