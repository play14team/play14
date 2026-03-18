"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { type ClaimableEvent, submitAttendanceClaim } from "./claim-attendance.action"

interface ClaimFormProps {
  event: ClaimableEvent
  onBack: () => void
  onSubmitted: () => void
}

export default function ClaimForm({ event, onBack, onSubmitted }: ClaimFormProps) {
  const t = useTranslations("adminMisc.claims.claimAttendance")
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
      setError(t("reasonMinLength"))
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await submitAttendanceClaim(event.documentId, reason)

    if (result.success) {
      onSubmitted()
    } else {
      setError(result.error || t("submitFailed"))
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
        <i className="bx bx-arrow-back" />
        {t("backToEvents")}
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
              <i className="bx bx-calendar-event" />
            </div>
          )}
        </div>
        <div className="claim-form-event-info">
          <h3 className="claim-form-event-name">{event.name}</h3>
          <div className="claim-form-event-meta">
            <span>
              <i className="bx bx-calendar" />
              {formatDate(event.start)}
            </span>
            {event.location?.name && (
              <span>
                <i className="bx bx-map" />
                {event.location.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="claim-form-fields">
        <div className="form-group">
          <label htmlFor="reason">{t("reasonLabel")}</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("reasonPlaceholder")}
            rows={4}
            disabled={isSubmitting}
            minLength={20}
            required
          />
          <span
            style={{
              fontSize: "12px",
              color:
                reason.length >= 20 ? "var(--color-green, #22c55e)" : "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginTop: "4px",
            }}
          >
            {t("charMinimum", { count: reason.length })}
            {reason.length >= 20 && <i className="bx bx-check" />}
          </span>
        </div>

        {error && (
          <div className="claim-card-error">
            <i className="bx bx-error-circle" />
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
            {t("cancel")}
          </button>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={isSubmitting || reason.length < 20}
          >
            {isSubmitting ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                <i className="bx bx-send" />
                {t("submitClaim")}
              </>
            )}
          </button>
        </div>

        <div className="event-search-hint" style={{ marginTop: "8px" }}>
          <i className="bx bx-info-circle" />
          <span>{t("reviewHint")}</span>
        </div>
      </form>
    </div>
  )
}
