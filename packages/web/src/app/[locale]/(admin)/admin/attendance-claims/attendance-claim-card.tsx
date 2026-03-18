"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import Avatar from "@/components/ui/avatar"
import { Link } from "@/i18n/navigation"
import type { AttendanceClaim } from "./attendance-claims.action"
import { approveAttendanceClaim, rejectAttendanceClaim } from "./attendance-claims.action"

interface AttendanceClaimCardProps {
  claim: AttendanceClaim
  onActionComplete: () => void
}

export default function AttendanceClaimCard({ claim, onActionComplete }: AttendanceClaimCardProps) {
  const t = useTranslations("adminMisc.claims.attendance")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [adminNotes, setAdminNotes] = useState("")
  const [error, setError] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleApprove = async () => {
    setIsProcessing(true)
    setError(null)

    const result = await approveAttendanceClaim(claim.documentId)

    if (result.success) {
      onActionComplete()
    } else {
      setError(result.error || t("approveFailed"))
    }

    setIsProcessing(false)
  }

  const handleReject = async () => {
    setIsProcessing(true)
    setError(null)

    const result = await rejectAttendanceClaim(claim.documentId, adminNotes)

    if (result.success) {
      setShowRejectModal(false)
      setAdminNotes("")
      onActionComplete()
    } else {
      setError(result.error || t("rejectFailed"))
    }

    setIsProcessing(false)
  }

  return (
    <>
      <div className="claim-card attendance-claim-card">
        <div className="claim-card-header">
          <div className="claim-card-player">
            <Avatar
              src={claim.player.avatar?.url}
              alt={claim.player.name}
              fallback={claim.player.name}
              size="md"
            />
            <div className="claim-card-player-info">
              <Link
                href={`/players/${claim.player.slug}`}
                className="claim-card-player-name"
                target="_blank"
              >
                {claim.player.name}
                <i className="bx bx-link-external" />
              </Link>
              {claim.player.position && (
                <span className="claim-card-player-position">{claim.player.position}</span>
              )}
            </div>
          </div>
          <div className="claim-card-date">
            <i className="bx bx-time" />
            {formatDateTime(claim.createdAt)}
          </div>
        </div>

        <div className="claim-card-event-info">
          <i className="bx bx-calendar-event" /> <span>{t("wantsAttendee")} </span>
          <Link
            href={`/events/${claim.event.slug}`}
            className="claim-card-event-link"
            target="_blank"
          >
            {claim.event.name}
            <i className="bx bx-link-external" />
          </Link>
          <span className="claim-card-event-date"> ({formatDate(claim.event.start)})</span>
        </div>

        <div className="claim-card-reason">
          <h4>{t("claimReason")}</h4>
          <p>{claim.reason}</p>
        </div>

        {error && (
          <div className="claim-card-error">
            <i className="bx bx-error-circle" />
            {error}
          </div>
        )}

        <div className="claim-card-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleApprove}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                {t("processing")}
              </>
            ) : (
              <>
                <i className="bx bx-check" />
                {t("approve")}
              </>
            )}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-danger-outline"
            onClick={() => setShowRejectModal(true)}
            disabled={isProcessing}
          >
            <i className="bx bx-x" />
            {t("reject")}
          </button>
        </div>
      </div>

      {showRejectModal && (
        <div className="claim-modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="claim-modal" onClick={(e) => e.stopPropagation()}>
            <div className="claim-modal-header">
              <h2>{t("rejectTitle")}</h2>
              <button
                type="button"
                className="claim-modal-close"
                onClick={() => setShowRejectModal(false)}
                disabled={isProcessing}
              >
                <i className="bx bx-x" />
              </button>
            </div>
            <div className="claim-modal-body">
              <p>
                {t.rich("rejectConfirm", {
                  playerName: claim.player.name,
                  eventName: claim.event.name,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
              <div className="form-group">
                <label htmlFor="adminNotes">{t("rejectReasonLabel")}</label>
                <textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t("rejectReasonPlaceholder")}
                  disabled={isProcessing}
                  rows={4}
                />
              </div>
              {error && (
                <div className="claim-card-error">
                  <i className="bx bx-error-circle" />
                  {error}
                </div>
              )}
            </div>
            <div className="claim-modal-actions">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowRejectModal(false)}
                disabled={isProcessing}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={handleReject}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" />
                    {t("rejecting")}
                  </>
                ) : (
                  <>
                    <i className="bx bx-x" />
                    {t("rejectClaim")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
