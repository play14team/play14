"use client"

import { useState } from "react"
import Image from "next/image"
import { submitAttendanceClaim, type ClaimableEvent } from "./claim-attendance.action"

interface ClaimFormProps {
  event: ClaimableEvent
  onBack: () => void
  onSubmitted: () => void
}

export default function ClaimForm({ event, onBack, onSubmitted }: ClaimFormProps) {
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
          <span style={{ fontSize: "12px", color: reason.length >= 20 ? "var(--color-green, #22c55e)" : "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
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
          <span>Your claim will be reviewed by the event organizers. You will receive an email when your claim is approved or rejected.</span>
        </div>
      </form>
    </div>
  )
}
