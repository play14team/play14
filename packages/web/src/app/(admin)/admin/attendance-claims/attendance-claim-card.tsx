"use client"

import Avatar from "@/components/ui/avatar"
import Link from "next/link"
import { useState } from "react"
import type { AttendanceClaim } from "./attendance-claims.action"
import { approveAttendanceClaim, rejectAttendanceClaim } from "./attendance-claims.action"

interface AttendanceClaimCardProps {
  claim: AttendanceClaim
  onActionComplete: () => void
}

export default function AttendanceClaimCard({ claim, onActionComplete }: AttendanceClaimCardProps) {
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
      setError(result.error || "Failed to approve claim")
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
      setError(result.error || "Failed to reject claim")
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
          <i className="bx bx-calendar-event" /> <span>Wants to be listed as attendee for: </span>
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
          <h4>Claim Reason</h4>
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
                Processing...
              </>
            ) : (
              <>
                <i className="bx bx-check" />
                Approve
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
            Reject
          </button>
        </div>
      </div>

      {showRejectModal && (
        <div className="claim-modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="claim-modal" onClick={(e) => e.stopPropagation()}>
            <div className="claim-modal-header">
              <h2>Reject Attendance Claim</h2>
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
                Are you sure you want to reject <strong>{claim.player.name}</strong>&apos;s claim to
                be listed as an attendee for <strong>{claim.event.name}</strong>?
              </p>
              <div className="form-group">
                <label htmlFor="adminNotes">
                  Reason for rejection (optional, will be sent to the player)
                </label>
                <textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Explain why this claim is being rejected..."
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
                Cancel
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
                    Rejecting...
                  </>
                ) : (
                  <>
                    <i className="bx bx-x" />
                    Reject Claim
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
