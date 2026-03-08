"use client"

import { useState } from "react"
import type { LinkedInAccountStatus } from "@/app/(admin)/admin/linkedin/linkedin.action"
import {
  disconnectLinkedIn,
  getLinkedInAuthUrl,
} from "@/app/(admin)/admin/linkedin/linkedin.action"
import { useToast } from "@/components/admin/toast"

interface LinkedInConnectProps {
  account: LinkedInAccountStatus | null
}

export default function LinkedInConnect({ account }: LinkedInConnectProps) {
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [currentAccount, setCurrentAccount] = useState(account)

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      const result = await getLinkedInAuthUrl()
      if (result.success && result.url) {
        window.location.href = result.url
      } else {
        toast.error(result.error || "Failed to start LinkedIn connection")
        setIsLoading(false)
      }
    } catch {
      toast.error("Failed to start LinkedIn connection")
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setIsLoading(true)
    try {
      const result = await disconnectLinkedIn()
      if (result.success) {
        setCurrentAccount(null)
        setShowConfirm(false)
        toast.success("LinkedIn account disconnected")
      } else {
        toast.error(result.error || "Failed to disconnect")
      }
    } catch {
      toast.error("Failed to disconnect LinkedIn account")
    }
    setIsLoading(false)
  }

  if (!currentAccount || currentAccount.accountStatus === "revoked") {
    return (
      <div className="linkedin-connect-section">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleConnect}
          disabled={isLoading}
        >
          <i className="bx bxl-linkedin-square" />
          {isLoading ? "Connecting..." : "Connect LinkedIn"}
        </button>
        <p className="admin-form-section-description" style={{ marginTop: "0.5rem" }}>
          Connect your personal LinkedIn account to post event announcements and reminders.
        </p>
      </div>
    )
  }

  const statusBadgeClass =
    currentAccount.accountStatus === "active"
      ? "badge-success"
      : currentAccount.accountStatus === "expired"
        ? "badge-warning"
        : "badge-secondary"

  return (
    <div className="linkedin-connect-section">
      <div className="linkedin-account-info">
        <div className="linkedin-account-header">
          <i className="bx bxl-linkedin-square" style={{ fontSize: "1.5rem", color: "#0077b5" }} />
          <div>
            <strong>{currentAccount.displayName || "LinkedIn account"}</strong>
            <span className={`badge ${statusBadgeClass}`} style={{ marginLeft: "0.5rem" }}>
              {currentAccount.accountStatus}
            </span>
          </div>
        </div>

        {currentAccount.connectedAt && (
          <p className="admin-form-section-description">
            Connected {new Date(currentAccount.connectedAt).toLocaleDateString()}
          </p>
        )}

        {currentAccount.accountStatus === "expired" && (
          <div style={{ marginTop: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleConnect}
              disabled={isLoading}
            >
              Reconnect
            </button>
          </div>
        )}
      </div>

      {showConfirm ? (
        <div className="linkedin-disconnect-confirm" style={{ marginTop: "1rem" }}>
          <p>Are you sure you want to disconnect your LinkedIn account?</p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleDisconnect}
              disabled={isLoading}
            >
              {isLoading ? "Disconnecting..." : "Yes, disconnect"}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowConfirm(false)}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          onClick={() => setShowConfirm(true)}
          style={{ marginTop: "0.5rem" }}
        >
          Disconnect
        </button>
      )}
    </div>
  )
}
