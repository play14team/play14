"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  getClaimableEvents,
  searchClaimableEvents,
  getMyAttendanceClaims,
  submitAttendanceClaim,
  cancelAttendanceClaim,
  type ClaimableEvent,
  type AttendanceClaim,
} from "../events.action"
import { EventCard, EventFilterBar, EventsEmptyState } from "../components"

type View = "search" | "claim"

interface ClaimsTabProps {
  onPendingCountChange?: (count: number) => void
}

export default function ClaimsTab({ onPendingCountChange }: ClaimsTabProps) {
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
      // Filter out approved claims - they show in Attended tab
      const nonApprovedClaims = (claimsResult.claims || []).filter(
        (c) => c.claimStatus !== "approved"
      )
      setClaims(nonApprovedClaims)

      // Count only pending claims for the badge
      const pendingCount = nonApprovedClaims.filter(
        (c) => c.claimStatus === "pending"
      ).length
      onPendingCountChange?.(pendingCount)
    }

    setIsLoading(false)
  }, [onPendingCountChange])

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
      {/* My Claims Section - only show pending/rejected */}
      {claims.length > 0 && (
        <MyClaims claims={claims} onClaimCancelled={handleClaimCancelled} />
      )}

      {/* Main Content */}
      {view === "search" && (
        <EventSearch events={events} onSelectEvent={handleSelectEvent} />
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

// ============================================================================
// MY CLAIMS COMPONENT
// ============================================================================

interface MyClaimsProps {
  claims: AttendanceClaim[]
  onClaimCancelled: () => void
}

function MyClaims({ claims, onClaimCancelled }: MyClaimsProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pendingClaims = claims.filter((c) => c.claimStatus === "pending")
  const rejectedClaims = claims.filter((c) => c.claimStatus === "rejected")

  const handleCancel = async (claimId: string) => {
    if (!confirm("Are you sure you want to cancel this claim?")) return

    setCancellingId(claimId)
    setError(null)

    const result = await cancelAttendanceClaim(claimId)

    if (result.success) {
      onClaimCancelled()
    } else {
      setError(result.error || "Failed to cancel claim")
    }

    setCancellingId(null)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="claim-status-badge claim-status-pending">
            <i className="bx bx-time-five"></i>
            Pending
          </span>
        )
      case "rejected":
        return (
          <span className="claim-status-badge claim-status-rejected">
            <i className="bx bx-x"></i>
            Rejected
          </span>
        )
      default:
        return null
    }
  }

  if (claims.length === 0) {
    return null
  }

  return (
    <div className="my-claims">
      <div className="my-claims-header">
        <h3>
          My Claims
          <span className="my-claims-count">{claims.length}</span>
        </h3>
      </div>

      {error && (
        <div className="claim-card-error">
          <i className="bx bx-error-circle"></i>
          {error}
        </div>
      )}

      {/* Pending Claims */}
      {pendingClaims.length > 0 && (
        <div className="my-claims-list">
          {pendingClaims.map((claim) => (
            <div key={claim.documentId} className="my-claim-item my-claim-item-pending">
              <div className="my-claim-item-image">
                {claim.event?.defaultImage?.url ? (
                  <Image
                    src={claim.event.defaultImage.url}
                    alt={claim.event.name}
                    width={80}
                    height={60}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                    unoptimized
                  />
                ) : (
                  <div className="my-claim-item-image-placeholder">
                    <i className="bx bx-calendar-event"></i>
                  </div>
                )}
              </div>
              <div className="my-claim-item-content">
                <h4 className="my-claim-item-name">{claim.event?.name || "Unknown Event"}</h4>
                <div className="my-claim-item-meta">
                  <span>
                    <i className="bx bx-calendar"></i>
                    {claim.event?.start ? formatDate(claim.event.start) : ""}
                  </span>
                  {claim.event?.location?.name && (
                    <span>
                      <i className="bx bx-map"></i>
                      {claim.event.location.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="my-claim-item-status">
                {getStatusBadge(claim.claimStatus)}
              </div>
              <div className="my-claim-item-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-danger-outline admin-btn-sm"
                  onClick={() => handleCancel(claim.documentId)}
                  disabled={cancellingId === claim.documentId}
                  title="Cancel claim"
                >
                  {cancellingId === claim.documentId ? (
                    <i className="bx bx-loader-alt bx-spin"></i>
                  ) : (
                    <>
                      <i className="bx bx-x"></i>
                      Cancel
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejected Claims */}
      {rejectedClaims.length > 0 && (
        <div className="my-claims-list">
          {rejectedClaims.map((claim) => (
            <div
              key={claim.documentId}
              className="my-claim-item my-claim-item-rejected"
            >
              <div className="my-claim-item-image">
                {claim.event?.defaultImage?.url ? (
                  <Image
                    src={claim.event.defaultImage.url}
                    alt={claim.event.name}
                    width={80}
                    height={60}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                    unoptimized
                  />
                ) : (
                  <div className="my-claim-item-image-placeholder">
                    <i className="bx bx-calendar-event"></i>
                  </div>
                )}
              </div>
              <div className="my-claim-item-content">
                <h4 className="my-claim-item-name">{claim.event?.name || "Unknown Event"}</h4>
                <div className="my-claim-item-meta">
                  <span>
                    <i className="bx bx-calendar"></i>
                    {claim.event?.start ? formatDate(claim.event.start) : ""}
                  </span>
                  {claim.adminNotes && (
                    <span title={claim.adminNotes}>
                      <i className="bx bx-message-detail"></i>
                      {claim.adminNotes.length > 30
                        ? claim.adminNotes.substring(0, 30) + "..."
                        : claim.adminNotes}
                    </span>
                  )}
                </div>
              </div>
              <div className="my-claim-item-status">
                {getStatusBadge(claim.claimStatus)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// EVENT SEARCH COMPONENT
// ============================================================================

interface EventSearchProps {
  events: ClaimableEvent[]
  onSelectEvent: (event: ClaimableEvent) => void
}

function EventSearch({ events, onSelectEvent }: EventSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ClaimableEvent[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Filter events based on search
  const displayEvents = useMemo(() => {
    if (searchQuery.length < 2) return events

    // If we're actively searching server-side, use those results
    if (searchResults.length > 0 || isSearching) return searchResults

    // Local filter fallback
    const query = searchQuery.toLowerCase()
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.location?.name.toLowerCase().includes(query)
    )
  }, [events, searchQuery, searchResults, isSearching])

  useEffect(() => {
    const searchEventsAsync = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      const result = await searchClaimableEvents(searchQuery)
      if (result.success) {
        setSearchResults(result.events || [])
      }
      setIsSearching(false)
    }

    const debounce = setTimeout(searchEventsAsync, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  if (events.length === 0 && !searchQuery) {
    return (
      <EventsEmptyState
        icon="bx-check-circle"
        title="No Events to Claim"
        message="You may have already attended or claimed all available events."
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
        searchPlaceholder="Search events by name or location..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        isSearching={isSearching}
        filteredCount={displayEvents.length}
        totalCount={events.length}
        countLabel="events available to claim"
      />

      {displayEvents.length === 0 ? (
        <EventsEmptyState
          icon="bx-search-alt"
          title="No Events Found"
          message={
            searchQuery.length >= 2
              ? `No events matching "${searchQuery}"`
              : "No events available to claim."
          }
          action={
            searchQuery
              ? {
                  label: "Clear Search",
                  onClick: () => setSearchQuery(""),
                  variant: "secondary",
                }
              : undefined
          }
        />
      ) : (
        <div className="events-grid">
          {displayEvents.map((event) => (
            <EventCard
              key={event.documentId}
              event={{
                documentId: event.documentId,
                slug: event.slug || "",
                name: event.name,
                start: event.start,
                end: event.end || event.start,
                defaultImage: event.defaultImage,
                location: event.location,
              }}
              action={{
                type: "button",
                label: "Claim Attendance",
                onClick: () => onSelectEvent(event),
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CLAIM FORM COMPONENT
// ============================================================================

interface ClaimFormProps {
  event: ClaimableEvent
  onBack: () => void
  onSubmitted: () => void
}

function ClaimForm({ event, onBack, onSubmitted }: ClaimFormProps) {
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (reason.length < 20) {
      setError("Please provide a reason with at least 20 characters")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await submitAttendanceClaim(event.documentId, reason)

    if (result.success) {
      onSubmitted()
    } else {
      setError(result.error || "Failed to submit claim")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="claim-form">
      <button
        type="button"
        className="admin-btn admin-btn-secondary admin-btn-sm"
        onClick={onBack}
        disabled={isSubmitting}
        style={{ alignSelf: "flex-start", marginBottom: "16px" }}
      >
        <i className="bx bx-arrow-back"></i>
        Back to Events
      </button>

      <div className="claim-form-event">
        <div className="claim-form-event-image">
          {event.defaultImage?.url ? (
            <Image
              src={event.defaultImage.url}
              alt={event.name}
              width={120}
              height={90}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
              unoptimized
            />
          ) : (
            <div className="claim-form-event-image-placeholder">
              <i className="bx bx-calendar-event"></i>
            </div>
          )}
        </div>
        <div className="claim-form-event-info">
          <h3 className="claim-form-event-name">{event.name}</h3>
          <div className="claim-form-event-meta">
            <span>
              <i className="bx bx-calendar"></i>
              {formatDate(event.start)}
            </span>
            {event.location?.name && (
              <span>
                <i className="bx bx-map"></i>
                {event.location.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="claim-form-fields">
        <div className="form-group">
          <label htmlFor="reason">Why should you be listed as an attendee?</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please explain how you participated in this event. For example: 'I attended all three days of the event and participated in multiple game sessions including...'"
            rows={4}
            disabled={isSubmitting}
            minLength={20}
            required
          />
          <span
            style={{
              fontSize: "12px",
              color:
                reason.length >= 20
                  ? "var(--color-green, #22c55e)"
                  : "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginTop: "4px",
            }}
          >
            {reason.length}/20 characters minimum
            {reason.length >= 20 && <i className="bx bx-check"></i>}
          </span>
        </div>

        {error && (
          <div className="claim-card-error">
            <i className="bx bx-error-circle"></i>
            {error}
          </div>
        )}

        <div className="claim-form-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onBack}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={isSubmitting || reason.length < 20}
          >
            {isSubmitting ? (
              <>
                <i className="bx bx-loader-alt bx-spin"></i>
                Submitting...
              </>
            ) : (
              <>
                <i className="bx bx-send"></i>
                Submit Claim
              </>
            )}
          </button>
        </div>

        <div className="event-search-hint" style={{ marginTop: "8px" }}>
          <i className="bx bx-info-circle"></i>
          <span>
            Your claim will be reviewed by the event organizers. You will receive
            an email when your claim is approved or rejected.
          </span>
        </div>
      </form>
    </div>
  )
}
