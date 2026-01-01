"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import EventSearch from "./event-search"
import MyClaims from "./my-claims"
import ClaimForm from "./claim-form"
import {
  getClaimableEvents,
  getMyAttendanceClaims,
  type ClaimableEvent,
  type AttendanceClaim,
} from "./claim-attendance.action"

type View = "search" | "claim"

export default function ClaimAttendanceContent() {
  const router = useRouter()
  const [view, setView] = useState<View>("search")
  const [events, setEvents] = useState<ClaimableEvent[]>([])
  const [claims, setClaims] = useState<AttendanceClaim[]>([])
  const [selectedEvent, setSelectedEvent] = useState<ClaimableEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const [eventsResult, claimsResult] = await Promise.all([
      getClaimableEvents(),
      getMyAttendanceClaims(),
    ])

    if (!eventsResult.success) {
      setError(eventsResult.error || "Failed to load events")
    } else {
      setEvents(eventsResult.events || [])
    }

    if (claimsResult.success) {
      setClaims(claimsResult.claims || [])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSelectEvent = (event: ClaimableEvent) => {
    setSelectedEvent(event)
    setView("claim")
  }

  const handleBackToSearch = () => {
    setSelectedEvent(null)
    setView("search")
  }

  const handleClaimSubmitted = () => {
    setSelectedEvent(null)
    setView("search")
    fetchData()
    router.refresh()
  }

  const handleClaimCancelled = () => {
    fetchData()
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="claims-loading">
        <i className="bx bx-loader-alt bx-spin"></i>
        <span>Loading...</span>
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
          onClick={fetchData}
        >
          <i className="bx bx-refresh"></i>
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="claim-attendance-content">
      {/* My Claims Section */}
      {claims.length > 0 && (
        <MyClaims claims={claims} onClaimCancelled={handleClaimCancelled} />
      )}

      {/* Main Content */}
      {view === "search" && (
        <EventSearch
          events={events}
          onSelectEvent={handleSelectEvent}
        />
      )}

      {view === "claim" && selectedEvent && (
        <ClaimForm
          event={selectedEvent}
          onBack={handleBackToSearch}
          onSubmitted={handleClaimSubmitted}
        />
      )}
    </div>
  )
}
