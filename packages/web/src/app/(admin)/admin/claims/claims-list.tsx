"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import ClaimCard from "./claim-card"
import { getPendingClaims, type PlayerClaim } from "./claims.action"

export default function ClaimsList() {
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
      setError(result.error || "Failed to fetch claims")
    }

    setIsLoading(false)
  }, [])

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
        <i className="bx bx-loader-alt bx-spin"></i>
        <span>Loading claims...</span>
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
          onClick={fetchClaims}
        >
          <i className="bx bx-refresh"></i>
          Try Again
        </button>
      </div>
    )
  }

  if (claims.length === 0) {
    return (
      <div className="claims-empty">
        <div className="claims-empty-icon">
          <i className="bx bx-check-circle"></i>
        </div>
        <h3>No Pending Claims</h3>
        <p>All player profile claims have been processed.</p>
      </div>
    )
  }

  return (
    <div className="claims-list">
      <div className="claims-count">
        <span className="claims-count-badge">{claims.length}</span>
        pending claim{claims.length !== 1 ? "s" : ""} to review
      </div>
      <div className="claims-grid">
        {claims.map((claim) => (
          <ClaimCard
            key={claim.documentId}
            claim={claim}
            onActionComplete={handleActionComplete}
          />
        ))}
      </div>
    </div>
  )
}
