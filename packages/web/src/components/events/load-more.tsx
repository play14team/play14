"use client"

import { useCallback, useEffect, useState } from "react"
import { useIntersection } from "@/hooks/useIntersection"
import type { Event, Pagination } from "@/models/strapi"
import Loader from "../layout/loader"
import { getEvents } from "./get.action"
import EventGrid from "./grid"

interface EventFilters {
  status?: string | string[]
  location?: string | string[]
  country?: string | string[]
  year?: number
}

interface LoadMoreProps {
  pagination: Pagination
  filters?: EventFilters
}

export default function LoadMore({ pagination, filters }: LoadMoreProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [isVisible, triggerRef] = useIntersection("800px")

  const loadMore = useCallback(() => {
    getEvents(
      pagination.page + 1,
      pagination.pageSize,
      filters?.status,
      filters?.location,
      filters?.country,
      filters?.year
    ).then((res) => {
      // In Strapi 5, events_connection returns nodes
      const events = (res.events_connection?.nodes || []) as Event[]
      setEvents(events)
    })
  }, [pagination.page, pagination.pageSize, filters])

  useEffect(() => {
    if (isVisible) {
      loadMore()
    }
  }, [loadMore, isVisible])

  if (pagination.page === pagination.pageCount) return null

  if (events.length === 0)
    return (
      <div ref={triggerRef}>
        <Loader />
      </div>
    )

  const newPagination = { ...pagination, page: pagination.page + 1 }

  return (
    <div aria-live="polite">
      <EventGrid events={events} />
      <LoadMore pagination={newPagination} filters={filters} />
    </div>
  )
}
