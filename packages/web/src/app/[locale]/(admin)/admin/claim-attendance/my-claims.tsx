"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { type AttendanceClaim, cancelAttendanceClaim } from "./claim-attendance.action"

interface MyClaimsProps {
  claims: AttendanceClaim[]
  onClaimCancelled: () => void
}

export default function MyClaims({ claims, onClaimCancelled }: MyClaimsProps) {
  const t = useTranslations("adminMisc.claims.claimAttendance")
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pendingClaims = claims.filter((c) => c.claimStatus === "pending")
  const processedClaims = claims.filter((c) => c.claimStatus !== "pending")

  const handleCancel = async (claimId: string) => {
    if (!confirm(t("cancelConfirm"))) return

    setCancellingId(claimId)
    setError(null)

    const result = await cancelAttendanceClaim(claimId)

    if (result.success) {
      onClaimCancelled()
    } else {
      setError(result.error || t("cancelFailed"))
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
            <i className="bx bx-time-five" />
            {t("statusPending")}
          </span>
        )
      case "approved":
        return (
          <span className="claim-status-badge claim-status-approved">
            <i className="bx bx-check" />
            {t("statusApproved")}
          </span>
        )
      case "rejected":
        return (
          <span className="claim-status-badge claim-status-rejected">
            <i className="bx bx-x" />
            {t("statusRejected")}
          </span>
        )
      default:
        return null
    }
  }

  if (claims.length === 0) {
    return (
      <div className="my-claims">
        <div className="my-claims-header">
          <h3>{t("myClaimsTitle")}</h3>
        </div>
        <div className="my-claims-empty">
          <i className="bx bx-calendar-check" />
          <p>{t("noClaimsYet")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="my-claims">
      <div className="my-claims-header">
        <h3>
          {t("myClaimsTitle")}
          <span className="my-claims-count">{claims.length}</span>
        </h3>
      </div>

      {error && (
        <div className="claim-card-error">
          <i className="bx bx-error-circle" />
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
                    <i className="bx bx-calendar-event" />
                  </div>
                )}
              </div>
              <div className="my-claim-item-content">
                <h4 className="my-claim-item-name">{claim.event?.name || t("unknownEvent")}</h4>
                <div className="my-claim-item-meta">
                  <span>
                    <i className="bx bx-calendar" />
                    {claim.event?.start ? formatDate(claim.event.start) : ""}
                  </span>
                  {claim.event?.location?.name && (
                    <span>
                      <i className="bx bx-map" />
                      {claim.event.location.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="my-claim-item-status">{getStatusBadge(claim.claimStatus)}</div>
              <div className="my-claim-item-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-danger-outline admin-btn-sm"
                  onClick={() => handleCancel(claim.documentId)}
                  disabled={cancellingId === claim.documentId}
                  title={t("cancelClaim")}
                >
                  {cancellingId === claim.documentId ? (
                    <i className="bx bx-loader-alt bx-spin" />
                  ) : (
                    <>
                      <i className="bx bx-x" />
                      {t("cancelClaim")}
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Processed Claims */}
      {processedClaims.length > 0 && (
        <div className="my-claims-list">
          {processedClaims.map((claim) => (
            <div
              key={claim.documentId}
              className={`my-claim-item my-claim-item-${claim.claimStatus}`}
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
                    <i className="bx bx-calendar-event" />
                  </div>
                )}
              </div>
              <div className="my-claim-item-content">
                <h4 className="my-claim-item-name">{claim.event?.name || t("unknownEvent")}</h4>
                <div className="my-claim-item-meta">
                  <span>
                    <i className="bx bx-calendar" />
                    {claim.event?.start ? formatDate(claim.event.start) : ""}
                  </span>
                  {claim.adminNotes && (
                    <span title={claim.adminNotes}>
                      <i className="bx bx-message-detail" />
                      {claim.adminNotes.length > 30
                        ? `${claim.adminNotes.substring(0, 30)}...`
                        : claim.adminNotes}
                    </span>
                  )}
                </div>
              </div>
              <div className="my-claim-item-status">{getStatusBadge(claim.claimStatus)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
