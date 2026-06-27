"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import {
  type PlayerForInvite,
  searchPlayersForInvite,
} from "@/app/[locale]/(admin)/admin/players/invite.action"
import { requestRefund } from "@/components/tickets/purchase.action"
import { useDebounce } from "@/hooks/use-debounce"
import {
  type AddParticipantPayload,
  addParticipant,
  checkInParticipant,
  getEventParticipants,
  getParticipantStats,
  type Participant,
  removeParticipant,
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

  // Add-participant modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addMode, setAddMode] = useState<"existing" | "new">("existing")
  const [playerQuery, setPlayerQuery] = useState("")
  const debouncedPlayerQuery = useDebounce(playerQuery, 300)
  const [searchResults, setSearchResults] = useState<PlayerForInvite[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerForInvite | null>(null)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Remove-participant confirmation (manual entries only)
  const [removingParticipant, setRemovingParticipant] = useState<Participant | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

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

  // Search players for the "existing player" picker
  useEffect(() => {
    if (!showAddModal || addMode !== "existing") return
    const query = debouncedPlayerQuery.trim()
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    searchPlayersForInvite(query)
      .then((players) => {
        if (!cancelled) setSearchResults(players)
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedPlayerQuery, showAddModal, addMode])

  const openAddModal = () => {
    setAddMode("existing")
    setPlayerQuery("")
    setSearchResults([])
    setSelectedPlayer(null)
    setNewName("")
    setNewEmail("")
    setAddError(null)
    setShowAddModal(true)
  }

  const closeAddModal = () => {
    if (isAdding) return
    setShowAddModal(false)
  }

  const handleAddSubmit = async () => {
    setAddError(null)

    let payload: AddParticipantPayload
    if (addMode === "existing") {
      if (!selectedPlayer) {
        setAddError(t("addSelectPlayerRequired"))
        return
      }
      payload = { playerDocumentId: selectedPlayer.documentId }
    } else {
      const name = newName.trim()
      if (name.length < 2) {
        setAddError(t("addNameRequired"))
        return
      }
      payload = { newPlayer: { name, email: newEmail.trim() || undefined } }
    }

    setIsAdding(true)
    const result = await addParticipant(eventDocumentId, payload)
    setIsAdding(false)

    if (result.success) {
      setShowAddModal(false)
      fetchData()
    } else {
      setAddError(result.error || t("addFailed"))
    }
  }

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

  const handleRemoveClick = (participant: Participant) => {
    setRemovingParticipant(participant)
    setRemoveError(null)
  }

  const handleRemoveCancel = () => {
    if (isRemoving) return
    setRemovingParticipant(null)
    setRemoveError(null)
  }

  const handleRemoveConfirm = async () => {
    if (!removingParticipant) return

    setIsRemoving(true)
    setRemoveError(null)

    const result = await removeParticipant(eventDocumentId, removingParticipant.documentId)

    setIsRemoving(false)

    if (result.success) {
      setRemovingParticipant(null)
      fetchData()
    } else {
      setRemoveError(result.error || t("removeFailed"))
    }
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
        <div className={styles.listHeader}>
          <div>
            <h2>{t("participantsList")}</h2>
            <p className="admin-form-section-description">{t("participantsListDescription")}</p>
          </div>
          <button type="button" className={styles.addButton} onClick={openAddModal}>
            <i className="bx bx-plus" />
            {t("addParticipant")}
          </button>
        </div>

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
                        {/* Manually-added participants (comp ticket, no order) can be removed */}
                        {!participant.order && (
                          <button
                            type="button"
                            className={`${styles.actionButton} ${styles.remove}`}
                            onClick={() => handleRemoveClick(participant)}
                          >
                            <i className="bx bx-trash" />
                            {t("remove")}
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

      {/* Add participant modal — intentionally reuses the refund modal's generic
          overlay/card classes (.refundModal / .modalContent); they are not refund-specific. */}
      {showAddModal && (
        <div className={styles.refundModal} onClick={closeAddModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>{t("addParticipantTitle")}</h3>

            <div className={styles.modeToggle}>
              <button
                type="button"
                className={`${styles.modeButton} ${addMode === "existing" ? styles.active : ""}`}
                onClick={() => {
                  setAddMode("existing")
                  setAddError(null)
                }}
              >
                {t("addExistingPlayer")}
              </button>
              <button
                type="button"
                className={`${styles.modeButton} ${addMode === "new" ? styles.active : ""}`}
                onClick={() => {
                  setAddMode("new")
                  setAddError(null)
                }}
              >
                {t("addNewPlayer")}
              </button>
            </div>

            {addMode === "existing" ? (
              <div className={styles.formGroup}>
                <label>{t("addSearchLabel")}</label>
                {selectedPlayer ? (
                  <div className={styles.selectedPlayer}>
                    <span>{selectedPlayer.name}</span>
                    <button
                      type="button"
                      className={styles.clearSelection}
                      onClick={() => setSelectedPlayer(null)}
                      aria-label={t("addClearSelection")}
                    >
                      <i className="bx bx-x" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder={t("addSearchPlaceholder")}
                      value={playerQuery}
                      onChange={(e) => setPlayerQuery(e.target.value)}
                    />
                    {searching && (
                      <div className={styles.searchHint}>
                        <i className="bx bx-loader-alt bx-spin" /> {t("addSearching")}
                      </div>
                    )}
                    {!searching &&
                      debouncedPlayerQuery.trim().length >= 2 &&
                      searchResults.length === 0 && (
                        <div className={styles.searchHint}>{t("addNoResults")}</div>
                      )}
                    {searchResults.length > 0 && (
                      <ul className={styles.searchResults}>
                        {searchResults.map((p) => (
                          <li key={p.documentId}>
                            <button
                              type="button"
                              className={styles.searchResultItem}
                              onClick={() => {
                                setSelectedPlayer(p)
                                setAddError(null)
                              }}
                            >
                              <span className={styles.resultName}>{p.name}</span>
                              {p.company && <span className={styles.resultMeta}>{p.company}</span>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                <div className={styles.formGroup}>
                  <label>{t("addNameLabel")}</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder={t("addNamePlaceholder")}
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value)
                      setAddError(null)
                    }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t("addEmailLabel")}</label>
                  <input
                    type="email"
                    className="admin-input"
                    placeholder={t("addEmailPlaceholder")}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
              </>
            )}

            {addError && <div className={styles.error}>{addError}</div>}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={closeAddModal}
                disabled={isAdding}
              >
                {t("addCancel")}
              </button>
              <button
                type="button"
                className={styles.addConfirmButton}
                onClick={handleAddSubmit}
                disabled={isAdding}
              >
                {isAdding ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" /> {t("addSubmitting")}
                  </>
                ) : (
                  t("addConfirm")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove participant confirmation (manual entries only) — reuses the shared modal classes */}
      {removingParticipant && (
        <div className={styles.refundModal} onClick={handleRemoveCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>{t("removeTitle")}</h3>
            <p>{t("removeConfirmText", { name: getDisplayName(removingParticipant) })}</p>

            {removeError && <div className={styles.error}>{removeError}</div>}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleRemoveCancel}
                disabled={isRemoving}
              >
                {t("removeCancel")}
              </button>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={handleRemoveConfirm}
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" /> {t("removeProcessing")}
                  </>
                ) : (
                  t("removeConfirm")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
