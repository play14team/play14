"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import { requestRefund } from "@/components/tickets/purchase.action"
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
  const t = useTranslations("adminEvents.participants")

  const [participants, setParticipants] = useState<Participant[]>([])
  const [stats, setStats] = useState<{ total: number; checkedIn: number; pending: number } | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "checked-in" | "pending">("all")
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null)
  const [refundReason, setRefundReason] = useState("")
  const [refundError, setRefundError] = useState<string | null>(null)
  const [isRefunding, setIsRefunding] = useState(false)

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

  const handleRefundClick = (participant: Participant) => {
    if (!participant.order?.documentId) return
    setRefundingOrderId(participant.order.documentId)
    setRefundReason("")
    setRefundError(null)
  }

  const handleRefundCancel = () => {
    setRefundingOrderId(null)
    setRefundReason("")
    setRefundError(null)
  }

  const handleRefundConfirm = async () => {
    if (!refundingOrderId) return
    if (!refundReason.trim()) {
      setRefundError(t("refundReasonRequired"))
      return
    }

    setIsRefunding(true)
    setRefundError(null)

    const result = await requestRefund(refundingOrderId, refundReason.trim())

    if (result.success) {
      setRefundingOrderId(null)
      setRefundReason("")
      fetchData()
    } else {
      setRefundError(result.error || t("refundFailed"))
    }

    setIsRefunding(false)
  }

  const getRefundingOrder = () => {
    if (!refundingOrderId) return null
    const participant = participants.find((p) => p.order?.documentId === refundingOrderId)
    return participant?.order || null
  }

  const getOrderTicketCount = (orderDocumentId: string): number => {
    return participants.filter((p) => p.order?.documentId === orderDocumentId).length
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
    return t("unknown")
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
          {t("loadingParticipants")}
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
        <h2>{t("attendanceOverview")}</h2>
        <p className="admin-form-section-description">{t("attendanceDescription")}</p>

        {stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <i className="bx bx-user-check" />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats.total}</span>
                <span className={styles.statLabel}>{t("totalParticipants")}</span>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.checkedIn}`}>
              <div className={styles.statIcon}>
                <i className="bx bx-check-circle" />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats.checkedIn}</span>
                <span className={styles.statLabel}>{t("checkedIn")}</span>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.pending}`}>
              <div className={styles.statIcon}>
                <i className="bx bx-time-five" />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{stats.pending}</span>
                <span className={styles.statLabel}>{t("awaitingCheckIn")}</span>
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
                <span className={styles.statLabel}>{t("checkInRate")}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Participants List Section */}
      <div className="admin-form-section">
        <h2>{t("participantsList")}</h2>
        <p className="admin-form-section-description">{t("participantsListDescription")}</p>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <i className="bx bx-search" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
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
              {t("filterAll")} ({stats?.total || 0})
            </button>
            <button
              type="button"
              className={`${styles.filterButton} ${statusFilter === "checked-in" ? styles.active : ""}`}
              onClick={() => setStatusFilter("checked-in")}
            >
              {t("filterCheckedIn")} ({stats?.checkedIn || 0})
            </button>
            <button
              type="button"
              className={`${styles.filterButton} ${statusFilter === "pending" ? styles.active : ""}`}
              onClick={() => setStatusFilter("pending")}
            >
              {t("filterAwaiting")} ({stats?.pending || 0})
            </button>
          </div>
        </div>

        {/* Participants Table */}
        {filteredParticipants.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="bx bx-user-x" />
            <p>{participants.length === 0 ? t("noParticipants") : t("noParticipantsFiltered")}</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("headerName")}</th>
                  <th>{t("headerEmail")}</th>
                  <th>{t("headerTicketType")}</th>
                  <th>{t("headerTshirt")}</th>
                  <th>{t("headerStatus")}</th>
                  <th>{t("headerActions")}</th>
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
                          {t("statusCheckedIn")}
                          {participant.checkedInAt && (
                            <span className={styles.checkedInTime}>
                              {formatDateTime(participant.checkedInAt)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className={`${styles.statusBadge} ${styles.pending}`}>
                          <i className="bx bx-time-five" />
                          {t("statusAwaiting")}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
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
                              {t("undo")}
                            </>
                          ) : (
                            <>
                              <i className="bx bx-check" />
                              {t("checkIn")}
                            </>
                          )}
                        </button>
                        {participant.order?.orderStatus === "paid" && (
                          <button
                            type="button"
                            className={`${styles.actionButton} ${styles.refund}`}
                            onClick={() => handleRefundClick(participant)}
                          >
                            <i className="bx bx-credit-card" />
                            {t("refund")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Modal */}
      {refundingOrderId && (
        <div className={styles.refundModal} onClick={handleRefundCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>{t("refundOrder")}</h3>

            {getRefundingOrder() && (
              <p>{t("refundOrderNumber", { orderNumber: getRefundingOrder()!.orderNumber })}</p>
            )}

            <div className={styles.warning}>
              <i className="bx bx-error" />
              <span>{t("refundWarning")}</span>
            </div>

            {getOrderTicketCount(refundingOrderId) > 1 && (
              <div className={styles.warning}>
                <i className="bx bx-group" />
                <span>
                  {t("refundMultipleTicketsWarning", {
                    count: getOrderTicketCount(refundingOrderId),
                  })}
                </span>
              </div>
            )}

            <div className={styles.formGroup}>
              <label>{t("refundReason")}</label>
              <textarea
                className={styles.textarea}
                value={refundReason}
                onChange={(e) => {
                  setRefundReason(e.target.value)
                  setRefundError(null)
                }}
                placeholder={t("refundReasonPlaceholder")}
              />
              {refundError && <div className={styles.error}>{refundError}</div>}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleRefundCancel}
                disabled={isRefunding}
              >
                {t("refundCancel")}
              </button>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={handleRefundConfirm}
                disabled={isRefunding}
              >
                {isRefunding ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" /> {t("refundProcessing")}
                  </>
                ) : (
                  t("refundConfirm")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
