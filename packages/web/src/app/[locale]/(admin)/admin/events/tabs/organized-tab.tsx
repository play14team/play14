"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useState } from "react"
import { publishEvent, unpublishEvent } from "../[slug]/event-edit.action"
import {
  type BadgeType,
  EventCard,
  EventFilterBar,
  EventsEmptyState,
  type FilterOption,
} from "../components"
import { getMyEvents, type MyEvent } from "../events.action"

type StatusFilter = "mine" | "active" | "all" | "drafts" | "over"

interface OrganizedTabProps {
  onCountChange?: (count: number) => void
}

export default function OrganizedTab({ onCountChange }: OrganizedTabProps) {
  const t = useTranslations("adminEvents")
  const [events, setEvents] = useState<MyEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("mine")

  const STATUS_FILTERS: FilterOption[] = [
    { value: "mine", label: t("filters.mine") },
    { value: "active", label: t("filters.active") },
    { value: "drafts", label: t("filters.drafts") },
    { value: "over", label: t("filters.past") },
    { value: "all", label: t("filters.all") },
  ]
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
      setError(t("list.failedToFetch"))
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
        <span>{t("list.loadingEvents")}</span>
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
        icon="bx-calendar-event"
        title={t("organized.noEventsYet")}
        message={t("organized.noEventsCreated")}
        action={{
          label: t("organized.createFirstEvent"),
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
        searchPlaceholder={t("search.searchEvents")}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filtersWithCounts}
        activeFilter={statusFilter}
        onFilterChange={(v) => setStatusFilter(v as StatusFilter)}
        toggles={[
          {
            id: "show-cancelled",
            label: t("filters.showCancelled"),
            checked: showCancelled,
            onChange: setShowCancelled,
          },
        ]}
        filteredCount={filteredEvents.length}
        totalCount={events.length}
        countLabel={t("organized.events")}
      />

      {filteredEvents.length === 0 ? (
        <EventsEmptyState
          icon="bx-filter-alt"
          title={t("organized.noEventsFound")}
          message={
            searchQuery
              ? t("search.noEventsMatching", { query: searchQuery })
              : statusFilter === "mine"
                ? t("organized.noMineEvents")
                : t("list.noFilteredEvents", { filter: statusFilter })
          }
          action={
            statusFilter !== "all" || searchQuery
              ? {
                  label: t("filters.clearFilters"),
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
                label: t("list.editEvent"),
                href: `/admin/events/${event.slug}`,
              }}
              quickActions={[
                {
                  icon: "bx-show",
                  title: t("list.previewEvent"),
                  href: `/admin/events/${event.slug}/preview`,
                },
                {
                  icon: event.isPublished ? "bx-hide" : "bx-globe",
                  title: event.isPublished ? t("list.unpublishEvent") : t("list.publishEvent"),
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
