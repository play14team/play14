"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import ClaimCard from "./claim-card"
import { getPendingClaims, type PlayerClaim } from "./claims.action"

export default function ClaimsList() {
  const t = useTranslations("adminMisc.claims.player")
  const router = useRouter()
  const [claims, setClaims] = useState<PlayerClaim[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClaims = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await getPendingClaims()

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

  return (
    <div className="claims-list">
      <div className="claims-count">
        <span className="claims-count-badge">{claims.length}</span>
        {t("pendingCount", { count: claims.length })}
      </div>
      <div className="claims-grid">
        {claims.map((claim) => (
          <ClaimCard key={claim.documentId} claim={claim} onActionComplete={handleActionComplete} />
        ))}
      </div>
    </div>
  )
}
