"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import AttendanceClaimCard from "./attendance-claim-card"
import {
  getPendingAttendanceClaimsForMyEvents,
  type AttendanceClaim,
} from "./attendance-claims.action"

export default function AttendanceClaimsList() {
  const router = useRouter()
  const [claims, setClaims] = useState<AttendanceClaim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClaims = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await getPendingAttendanceClaimsForMyEvents()

    if (result.success) {
      setClaims(result.claims || [])
    } else {
      setError(result.error || "Failed to fetch claims")
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchClaims()
  }, [fetchClaims])

  const handleActionComplete = () => {
    fetchClaims()
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="claims-loading">
        <i className="bx bx-loader-alt bx-spin"></i>
        <span>Loading claims...</span>
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
          onClick={fetchClaims}
        >
          <i className="bx bx-refresh"></i>
          Try Again
        </button>
      </div>
    )
  }

  if (claims.length === 0) {
    return (
      <div className="claims-empty">
        <div className="claims-empty-icon">
          <i className="bx bx-check-circle"></i>
        </div>
        <h3>No Pending Claims</h3>
        <p>All attendance claims for your events have been processed.</p>
      </div>
    )
  }

  // Group claims by event
  const claimsByEvent = claims.reduce((acc, claim) => {
    const eventId = claim.event?.documentId || "unknown"
    if (!acc[eventId]) {
      acc[eventId] = {
        event: claim.event,
        claims: [],
      }
    }
    acc[eventId].claims.push(claim)
    return acc
  }, {} as Record<string, { event: AttendanceClaim["event"]; claims: AttendanceClaim[] }>)

  return (
    <div className="attendance-claims-list">
      <div className="claims-count">
        <span className="claims-count-badge">{claims.length}</span>
        pending claim{claims.length !== 1 ? "s" : ""} to review
      </div>

      {Object.entries(claimsByEvent).map(([eventId, { event, claims: eventClaims }]) => (
        <div key={eventId} className="attendance-claims-event-group">
          <div className="attendance-claims-event-header">
            <h3>{event?.name || "Unknown Event"}</h3>
            <span className="attendance-claims-event-count">
              {eventClaims.length} claim{eventClaims.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="claims-grid">
            {eventClaims.map((claim) => (
              <AttendanceClaimCard
                key={claim.documentId}
                claim={claim}
                onActionComplete={handleActionComplete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
