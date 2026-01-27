"use client"

import { useCallback, useEffect, useState } from "react"
import { useIntersection } from "@/hooks/useIntersection"
import type { Event, Pagination } from "@/models/strapi"
import Loader from "../layout/loader"
import { getEventsByYear } from "./get.action"
import EventGrid from "./grid"

interface LoadMoreYearProps {
  pagination: Pagination
  year: number
}

export default function LoadMoreYear({ pagination, year }: LoadMoreYearProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [isVisible, triggerRef] = useIntersection("800px")
  const callback = useCallback(loadMore, [pagination.page, pagination.pageSize, year])

  useEffect(() => {
    if (isVisible) {
      callback()
    }
  }, [callback, isVisible])

  function loadMore() {
    getEventsByYear(year, pagination.page + 1, pagination.pageSize).then((res) => {
      const events = (res.events_connection?.nodes || []) as Event[]
      setEvents(events)
    })
  }

  if (pagination.page === pagination.pageCount) return

  if (events.length === 0)
    return (
      <div ref={triggerRef}>
        <Loader />
      </div>
    )

  const newPagination = { ...pagination, page: pagination.page + 1 }

  return (
    <>
      <EventGrid events={events} />
      <LoadMoreYear pagination={newPagination} year={year} />
    </>
  )
}
