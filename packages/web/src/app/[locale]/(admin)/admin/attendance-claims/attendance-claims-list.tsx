"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import AttendanceClaimCard from "./attendance-claim-card"
import {
  type AttendanceClaim,
  getPendingAttendanceClaimsForMyEvents,
} from "./attendance-claims.action"

export default function AttendanceClaimsList() {
  const t = useTranslations("adminMisc.claims.attendance")
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
      setError(result.error || t("approveFailed"))
    }

    setIsLoading(false)
  }, [t])

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
        <i className="bx bx-loader-alt bx-spin" />
        <span>{t("loading")}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="claims-error">
        <i className="bx bx-error-circle" />
        <p>{error}</p>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={fetchClaims}>
          <i className="bx bx-refresh" />
          {t("tryAgain")}
        </button>
      </div>
    )
  }

  if (claims.length === 0) {
    return (
      <div className="claims-empty">
        <div className="claims-empty-icon">
          <i className="bx bx-check-circle" />
        </div>
        <h3>{t("noPending")}</h3>
        <p>{t("allProcessed")}</p>
      </div>
    )
  }

  // Group claims by event
  const claimsByEvent = claims.reduce(
    (acc, claim) => {
      const eventId = claim.event?.documentId || "unknown"
      if (!acc[eventId]) {
        acc[eventId] = {
          event: claim.event,
          claims: [],
        }
      }
      acc[eventId].claims.push(claim)
      return acc
    },
    {} as Record<string, { event: AttendanceClaim["event"]; claims: AttendanceClaim[] }>
  )

  return (
    <div className="attendance-claims-list">
      <div className="claims-count">
        <span className="claims-count-badge">{claims.length}</span>
        {t("pendingCount", { count: claims.length })}
      </div>

      {Object.entries(claimsByEvent).map(([eventId, { event, claims: eventClaims }]) => (
        <div key={eventId} className="attendance-claims-event-group">
          <div className="attendance-claims-event-header">
            <h3>{event?.name || t("unknownEvent")}</h3>
            <span className="attendance-claims-event-count">
              {t("claimCount", { count: eventClaims.length })}
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
