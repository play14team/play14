"use client"

import { useState } from "react"
import {
  linkStripeAccountToEvent,
  unlinkStripeAccountFromEvent,
  type StripeAccountStatus,
  type HostStripeAccount,
} from "@/app/(admin)/admin/stripe/stripe-connect.action"

interface EventStripeAccount {
  documentId: string
  stripeAccountId: string
  accountStatus: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
}

interface Props {
  eventId: string
  currentAccount?: EventStripeAccount | null
  hostAccounts: HostStripeAccount[]
  playerAccount: StripeAccountStatus | null
  onUpdate: () => void
}

export default function StripeAccountSelector({
  eventId,
  currentAccount,
  hostAccounts,
  playerAccount,
  onUpdate,
}: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")

  const handleLinkAccount = async (stripeAccountId: string) => {
    setIsLoading(true)
    setError(null)

    const result = await linkStripeAccountToEvent(eventId, stripeAccountId)

    if (result.success) {
      onUpdate()
    } else {
      setError(result.error || "Failed to link account")
    }

    setIsLoading(false)
  }

  const handleUnlinkAccount = async () => {
    if (!confirm("Are you sure you want to disable online payments for this event?")) {
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await unlinkStripeAccountFromEvent(eventId)

    if (result.success) {
      onUpdate()
    } else {
      setError(result.error || "Failed to unlink account")
    }

    setIsLoading(false)
  }

  // Event already has a Stripe account linked
  if (currentAccount) {
    const isActive = currentAccount.accountStatus === "active" && currentAccount.chargesEnabled

    // Find owner info from host accounts if available
    const linkedHostAccount = hostAccounts.find(
      (a) => a.stripeAccountId === currentAccount.stripeAccountId
    )

    return (
      <div className="stripe-account-selector">
        {error && (
          <div className="admin-alert admin-alert-error admin-alert-sm">
            <i className="bx bx-error-circle"></i>
            {error}
          </div>
        )}

        <div className={`linked-account-card ${isActive ? "active" : "inactive"}`}>
          <div className="linked-account-info">
            <div className="linked-account-header">
              <i className="bx bxl-stripe"></i>
              <span>Stripe Connected</span>
              {isActive ? (
                <span className="account-badge success">Active</span>
              ) : (
                <span className="account-badge warning">Setup Required</span>
              )}
            </div>
            <p className="linked-account-id">{currentAccount.stripeAccountId}</p>
            {linkedHostAccount && (
              <p className="linked-account-owner">
                <i className="bx bx-user"></i>
                {linkedHostAccount.ownerName} ({linkedHostAccount.ownerRole})
              </p>
            )}
            {isActive ? (
              <p className="linked-account-status">
                Online payments are enabled for this event.
              </p>
            ) : (
              <p className="linked-account-status warning">
                Complete your Stripe account setup to enable payments.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleUnlinkAccount}
            disabled={isLoading}
            className="admin-btn admin-btn-secondary admin-btn-sm"
          >
            {isLoading ? (
              <i className="bx bx-loader-alt bx-spin"></i>
            ) : (
              <i className="bx bx-unlink"></i>
            )}
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  // Filter to only show active accounts that can receive payments
  const availableHostAccounts = hostAccounts.filter(
    (a) => a.accountStatus === "active" && a.chargesEnabled
  )

  // Check if current player has an active account not already in hostAccounts
  const playerHasOwnAccount =
    playerAccount?.accountStatus === "active" &&
    playerAccount?.chargesEnabled &&
    !hostAccounts.some((a) => a.stripeAccountId === playerAccount.stripeAccountId)

  // No accounts available at all
  if (availableHostAccounts.length === 0 && !playerHasOwnAccount) {
    // Check if player has an incomplete account
    if (playerAccount && playerAccount.accountStatus !== "active") {
      return (
        <div className="stripe-account-selector">
          <div className="stripe-setup-required">
            <i className="bx bx-error-circle"></i>
            <p>
              Your Stripe account setup is incomplete. Complete the setup to enable payments.
            </p>
            <a href="/admin/stripe" className="admin-btn admin-btn-primary admin-btn-sm">
              <i className="bx bx-right-arrow-alt"></i>
              Complete Setup
            </a>
          </div>
        </div>
      )
    }

    // No hosts have accounts, and player doesn't have one either
    return (
      <div className="stripe-account-selector">
        <div className="no-stripe-account">
          <i className="bx bxl-stripe"></i>
          <p>
            No payment accounts available. To receive payments for this event, you or another
            host needs to connect a Stripe account.
          </p>
          <a href="/admin/stripe" className="admin-btn admin-btn-secondary admin-btn-sm">
            <i className="bx bx-link"></i>
            Set up Stripe
          </a>
        </div>
      </div>
    )
  }

  // Build complete list of available accounts
  const allAvailableAccounts: Array<{
    stripeAccountId: string
    ownerName: string
    ownerRole: string
    isCurrentPlayer: boolean
  }> = [
    ...availableHostAccounts.map((a) => ({
      stripeAccountId: a.stripeAccountId,
      ownerName: a.ownerName,
      ownerRole: a.ownerRole,
      isCurrentPlayer: false,
    })),
  ]

  if (playerHasOwnAccount && playerAccount) {
    allAvailableAccounts.push({
      stripeAccountId: playerAccount.stripeAccountId,
      ownerName: playerAccount.businessName || "Your account",
      ownerRole: "you",
      isCurrentPlayer: true,
    })
  }

  // Only one account available - show simple link button
  if (allAvailableAccounts.length === 1) {
    const account = allAvailableAccounts[0]
    return (
      <div className="stripe-account-selector">
        {error && (
          <div className="admin-alert admin-alert-error admin-alert-sm">
            <i className="bx bx-error-circle"></i>
            {error}
          </div>
        )}

        <div className="available-account-card">
          <div className="available-account-info">
            <div className="available-account-header">
              <i className="bx bxl-stripe"></i>
              <span>
                {account.isCurrentPlayer ? "Your Stripe Account" : `${account.ownerName}'s Account`}
              </span>
              <span className="account-badge success">Ready</span>
            </div>
            <p className="available-account-id">{account.stripeAccountId}</p>
            <p className="available-account-hint">
              Connect this account to receive payments from event attendees.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleLinkAccount(account.stripeAccountId)}
            disabled={isLoading}
            className="admin-btn admin-btn-primary admin-btn-sm"
          >
            {isLoading ? (
              <>
                <i className="bx bx-loader-alt bx-spin"></i>
                Connecting...
              </>
            ) : (
              <>
                <i className="bx bx-link"></i>
                Enable Payments
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // Multiple accounts available - show selection UI
  return (
    <div className="stripe-account-selector">
      {error && (
        <div className="admin-alert admin-alert-error admin-alert-sm">
          <i className="bx bx-error-circle"></i>
          {error}
        </div>
      )}

      <div className="multi-account-selector">
        <div className="multi-account-header">
          <i className="bx bxl-stripe"></i>
          <span>Select Payment Account</span>
        </div>
        <p className="multi-account-description">
          Multiple organizers have Stripe accounts. Select which account should receive payments
          for this event.
        </p>

        <div className="account-options">
          {allAvailableAccounts.map((account) => (
            <label
              key={account.stripeAccountId}
              className={`account-option ${selectedAccountId === account.stripeAccountId ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="stripeAccount"
                value={account.stripeAccountId}
                checked={selectedAccountId === account.stripeAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              />
              <div className="account-option-content">
                <div className="account-option-header">
                  <span className="account-owner">
                    {account.isCurrentPlayer ? (
                      <>
                        <i className="bx bx-user-check"></i>
                        Your Account
                      </>
                    ) : (
                      <>
                        <i className="bx bx-user"></i>
                        {account.ownerName}
                      </>
                    )}
                  </span>
                  <span className="account-role">({account.ownerRole})</span>
                </div>
                <span className="account-id">{account.stripeAccountId}</span>
              </div>
              <div className="account-option-check">
                <i className="bx bx-check"></i>
              </div>
            </label>
          ))}
        </div>

        <div className="multi-account-actions">
          <button
            type="button"
            onClick={() => handleLinkAccount(selectedAccountId)}
            disabled={isLoading || !selectedAccountId}
            className="admin-btn admin-btn-primary"
          >
            {isLoading ? (
              <>
                <i className="bx bx-loader-alt bx-spin"></i>
                Connecting...
              </>
            ) : (
              <>
                <i className="bx bx-link"></i>
                Enable Payments
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
