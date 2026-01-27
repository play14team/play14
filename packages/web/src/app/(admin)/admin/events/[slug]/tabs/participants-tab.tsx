"use client"

import { useCallback, useEffect, useState } from "react"
import {
  checkInParticipant,
  getEventParticipants,
  getParticipantStats,
  type Participant,
  undoCheckIn,
} from "../participants.action"
import styles from "./participants-tab.module.scss"

interface ParticipantsTabProps {
  eventDocumentId: string
  onUpdate: () => void
}

export default function ParticipantsTab({ eventDocumentId }: ParticipantsTabProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [stats, setStats] = useState<{ total: number; checkedIn: number; pending: number } | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "checked-in" | "pending">("all")
  const [checkingIn, setCheckingIn] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [participantsResult, statsResult] = await Promise.all([
      getEventParticipants(eventDocumentId, 1, 500),
      getParticipantStats(eventDocumentId),
    ])

    if (!participantsResult.success || !participantsResult.data) {
      setError(participantsResult.error || "Failed to load participants")
      setLoading(false)
      return
    }

    setParticipants(participantsResult.data.participants)

    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data)
    }

    setLoading(false)
  }, [eventDocumentId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCheckIn = async (participant: Participant) => {
    setCheckingIn(participant.documentId)

    const result =
      participant.ticketStatus === "used"
        ? await undoCheckIn(eventDocumentId, participant.documentId)
        : await checkInParticipant(eventDocumentId, participant.documentId)

    if (result.success) {
      // Update local state
      setParticipants((prev) =>
        prev.map((p) =>
          p.documentId === participant.documentId
            ? {
                ...p,
                ticketStatus: participant.ticketStatus === "used" ? "valid" : "used",
                checkedInAt:
                  participant.ticketStatus === "used" ? undefined : new Date().toISOString(),
              }
            : p
        )
      )

      // Update stats
      if (stats) {
        setStats({
          ...stats,
          checkedIn:
            participant.ticketStatus === "used" ? stats.checkedIn - 1 : stats.checkedIn + 1,
          pending: participant.ticketStatus === "used" ? stats.pending + 1 : stats.pending - 1,
        })
      }
    }

    setCheckingIn(null)
  }

  const getDisplayName = (participant: Participant): string => {
    if (participant.attendeeInfo) {
      return `${participant.attendeeInfo.firstName} ${participant.attendeeInfo.lastName}`
    }
    if (participant.attendeeName) {
      return participant.attendeeName
    }
    if (participant.order?.purchaserName) {
      return participant.order.purchaserName
    }
    return "Unknown"
  }

  const getDisplayEmail = (participant: Participant): string => {
    if (participant.attendeeInfo?.email) {
      return participant.attendeeInfo.email
    }
    if (participant.attendeeEmail) {
      return participant.attendeeEmail
    }
    if (participant.order?.purchaserEmail) {
      return participant.order.purchaserEmail
    }
    return ""
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    // Status filter
    if (statusFilter === "checked-in" && p.ticketStatus !== "used") return false
    if (statusFilter === "pending" && p.ticketStatus !== "valid") return false

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const name = getDisplayName(p).toLowerCase()
      const email = getDisplayEmail(p).toLowerCase()
      const ticketCode = p.ticketCode.toLowerCase()
      const ticketType = p.ticketType?.name?.toLowerCase() || ""

      return (
        name.includes(query) ||
        email.includes(query) ||
        ticketCode.includes(query) ||
        ticketType.includes(query)
      )
    }

    return true
  })

  if (loading) {
    return (
      <div className="admin-form-section">
        <div className={styles.loading}>
          <i className="bx bx-loader-alt bx-spin" />
          Loading participants...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-form-section">
        <div className="admin-alert admin-alert-error">
          <i className="bx bx-error-circle" />
          {error}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Stats Section */}
      <div className="admin-form-section">
        <h2>Attendance Overview</h2>
        <p className="admin-form-section-description">
          Track participant registrations and check-ins for this event.
        </p>

        {stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <i className="bx bx-user-check" />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats.total}</span>
                <span className={styles.statLabel}>Total Participants</span>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.checkedIn}`}>
              <div className={styles.statIcon}>
                <i className="bx bx-check-circle" />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats.checkedIn}</span>
                <span className={styles.statLabel}>Checked In</span>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.pending}`}>
              <div className={styles.statIcon}>
                <i className="bx bx-time-five" />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats.pending}</span>
                <span className={styles.statLabel}>Awaiting Check-in</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <i className="bx bx-pie-chart-alt-2" />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>
                  {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}%
                </span>
                <span className={styles.statLabel}>Check-in Rate</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Participants List Section */}
      <div className="admin-form-section">
        <h2>Participants List</h2>
        <p className="admin-form-section-description">
          View and manage all registered participants.
        </p>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <i className="bx bx-search" />
            <input
              type="text"
              placeholder="Search by name, email, or ticket code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className={styles.statusFilters}>
            <button
              type="button"
              className={`${styles.filterButton} ${statusFilter === "all" ? styles.active : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All ({stats?.total || 0})
            </button>
            <button
              type="button"
              className={`${styles.filterButton} ${statusFilter === "checked-in" ? styles.active : ""}`}
              onClick={() => setStatusFilter("checked-in")}
            >
              Checked In ({stats?.checkedIn || 0})
            </button>
            <button
              type="button"
              className={`${styles.filterButton} ${statusFilter === "pending" ? styles.active : ""}`}
              onClick={() => setStatusFilter("pending")}
            >
              Awaiting ({stats?.pending || 0})
            </button>
          </div>
        </div>

        {/* Participants Table */}
        {filteredParticipants.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="bx bx-user-x" />
            <p>
              {participants.length === 0
                ? "No participants registered yet."
                : "No participants match your filters."}
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Ticket Type</th>
                  <th>T-Shirt</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((participant) => (
                  <tr
                    key={participant.documentId}
                    className={participant.ticketStatus === "used" ? styles.checkedInRow : ""}
                  >
                    <td>
                      <div className={styles.nameCell}>
                        <span className={styles.name}>{getDisplayName(participant)}</span>
                        <span className={styles.ticketCode}>{participant.ticketCode}</span>
                      </div>
                    </td>
                    <td>{getDisplayEmail(participant)}</td>
                    <td>{participant.ticketType?.name || "-"}</td>
                    <td>
                      {participant.attendeeInfo?.tshirtSize &&
                      participant.attendeeInfo.tshirtSize !== "none"
                        ? participant.attendeeInfo.tshirtSize
                        : "-"}
                    </td>
                    <td>
                      {participant.ticketStatus === "used" ? (
                        <span className={`${styles.statusBadge} ${styles.checkedIn}`}>
                          <i className="bx bx-check" />
                          Checked In
                          {participant.checkedInAt && (
                            <span className={styles.checkedInTime}>
                              {formatDateTime(participant.checkedInAt)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className={`${styles.statusBadge} ${styles.pending}`}>
                          <i className="bx bx-time-five" />
                          Awaiting
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${
                          participant.ticketStatus === "used" ? styles.undo : styles.checkIn
                        }`}
                        onClick={() => handleCheckIn(participant)}
                        disabled={checkingIn === participant.documentId}
                      >
                        {checkingIn === participant.documentId ? (
                          <i className="bx bx-loader-alt bx-spin" />
                        ) : participant.ticketStatus === "used" ? (
                          <>
                            <i className="bx bx-undo" />
                            Undo
                          </>
                        ) : (
                          <>
                            <i className="bx bx-check" />
                            Check In
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
