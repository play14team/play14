"use client"

import { useIntersection } from "@/hooks/useIntersection"
import { Event, Pagination } from "@/models/strapi"
import { RefObject, useCallback, useEffect, useRef, useState } from "react"
import Loader from "../layout/loader"
import { getEventsByYear } from "./get.action"
import EventGrid from "./grid"

interface LoadMoreYearProps {
  pagination: Pagination
  year: number
}

export default function LoadMoreYear({ pagination, year }: LoadMoreYearProps) {
  const [events, setEvents] = useState<Event[]>([])
  const triggerRef = useRef<HTMLDivElement>(null)
  const isVisible = useIntersection(
    triggerRef as RefObject<HTMLDivElement>,
    "800px",
  )
  const callback = useCallback(loadMore, [
    pagination.page,
    pagination.pageSize,
    year,
  ])

  useEffect(() => {
    if (isVisible) {
      callback()
    }
  }, [callback, isVisible])

  function loadMore() {
    getEventsByYear(year, pagination.page + 1, pagination.pageSize).then(
      (res) => {
        const events = (res.events_connection?.nodes || []) as Event[]
        setEvents(events)
      },
    )
  }

  if (pagination.page === pagination.pageCount) return

  if (events.length == 0)
    return (
      <div>
        <div ref={triggerRef}></div>
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
