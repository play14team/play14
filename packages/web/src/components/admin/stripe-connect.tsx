"use client"

import { useState } from "react"
import {
  createStripeAccount,
  getDashboardUrl,
  getOnboardingUrl,
  type StripeAccountStatus,
} from "@/app/[locale]/(admin)/admin/stripe/stripe-connect.action"

interface Props {
  account: StripeAccountStatus | null
  returnPath?: string
  onAccountCreated?: () => void
}

const COUNTRIES = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "DE", name: "Germany" },
  { code: "ES", name: "Spain" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "IT", name: "Italy" },
  { code: "LU", name: "Luxembourg" },
  { code: "NL", name: "Netherlands" },
  { code: "PT", name: "Portugal" },
  { code: "US", name: "United States" },
]

export default function StripeConnect({
  account,
  returnPath = "/admin/stripe",
  onAccountCreated,
}: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [country, setCountry] = useState("FR")
  const [businessType, setBusinessType] = useState<"individual" | "company">("individual")

  const handleCreateAccount = async () => {
    setIsLoading(true)
    setError(null)

    const result = await createStripeAccount(country, businessType)

    if (result.success) {
      setShowCreateForm(false)
      onAccountCreated?.()
      // After creating, get onboarding URL and redirect
      const onboardingResult = await getOnboardingUrl(returnPath)
      if (onboardingResult.success && onboardingResult.url) {
        // Keep loading state and show redirecting message
        setIsRedirecting(true)
        window.location.href = onboardingResult.url
        return
      }
    }

    setError(result.error || "Failed to create account")
    setIsLoading(false)
  }

  const handleContinueOnboarding = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getOnboardingUrl(returnPath)

    if (result.success && result.url) {
      // Keep loading state and show redirecting message
      setIsRedirecting(true)
      window.location.href = result.url
      return
    }

    setError(result.error || "Failed to get onboarding link")
    setIsLoading(false)
  }

  const handleOpenDashboard = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getDashboardUrl()

    if (result.success && result.url) {
      window.open(result.url, "_blank")
    } else {
      setError(result.error || "Failed to get dashboard link")
    }

    setIsLoading(false)
  }

  // Render account status
  const renderAccountStatus = () => {
    if (!account) return null

    const statusConfig = {
      pending: {
        icon: "bx-time-five",
        color: "status-warning",
        label: "Setup Required",
        description: "Complete your Stripe account setup to start receiving payments.",
      },
      active: {
        icon: "bx-check-circle",
        color: "status-success",
        label: "Active",
        description: "Your account is ready to receive payments.",
      },
      restricted: {
        icon: "bx-error",
        color: "status-warning",
        label: "Restricted",
        description: "Additional information required. Please complete verification.",
      },
      disabled: {
        icon: "bx-x-circle",
        color: "status-error",
        label: "Disabled",
        description: "Your account has been disabled. Contact support for assistance.",
      },
    }

    const config = statusConfig[account.accountStatus] || statusConfig.pending

    return (
      <div className={`stripe-account-status ${config.color}`}>
        <div className="status-header">
          <i className={`bx ${config.icon}`} />
          <span className="status-label">{config.label}</span>
        </div>
        <p className="status-description">{config.description}</p>

        {account.businessName && (
          <div className="account-detail">
            <span className="detail-label">Business:</span>
            <span className="detail-value">{account.businessName}</span>
          </div>
        )}

        <div className="account-detail">
          <span className="detail-label">Account ID:</span>
          <span className="detail-value">{account.stripeAccountId}</span>
        </div>

        <div className="account-capabilities">
          <div className={`capability ${account.chargesEnabled ? "enabled" : "disabled"}`}>
            <i className={`bx ${account.chargesEnabled ? "bx-check" : "bx-x"}`} />
            <span>Payments</span>
          </div>
          <div className={`capability ${account.payoutsEnabled ? "enabled" : "disabled"}`}>
            <i className={`bx ${account.payoutsEnabled ? "bx-check" : "bx-x"}`} />
            <span>Payouts</span>
          </div>
        </div>
      </div>
    )
  }

  // No account - show create button
  if (!account) {
    return (
      <div className="stripe-connect-widget">
        {error && (
          <div className="admin-alert admin-alert-error">
            <i className="bx bx-error-circle" />
            {error}
          </div>
        )}

        {!showCreateForm ? (
          <div className="stripe-connect-cta">
            <div className="stripe-logo">
              <i className="bx bxl-stripe" />
            </div>
            <h3>Connect with Stripe</h3>
            <p>Connect your Stripe account to receive payments directly from event attendees.</p>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="admin-btn admin-btn-primary"
            >
              <i className="bx bx-link" />
              Get Started
            </button>
          </div>
        ) : (
          <div className="stripe-create-form">
            <h3>Connect your Stripe Account</h3>

            <div className="admin-form-group">
              <label htmlFor="country">Country</label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="admin-select"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label>Business Type</label>
              <div className="admin-form-row">
                <label className="admin-radio-option">
                  <input
                    type="radio"
                    name="businessType"
                    value="individual"
                    checked={businessType === "individual"}
                    onChange={() => setBusinessType("individual")}
                  />
                  <span>Individual</span>
                </label>
                <label className="admin-radio-option">
                  <input
                    type="radio"
                    name="businessType"
                    value="company"
                    checked={businessType === "company"}
                    onChange={() => setBusinessType("company")}
                  />
                  <span>Company</span>
                </label>
              </div>
            </div>

            <div className="stripe-create-actions">
              <button
                type="button"
                onClick={handleCreateAccount}
                disabled={isLoading}
                className="admin-btn admin-btn-primary"
              >
                {isRedirecting ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" />
                    Redirecting to Stripe...
                  </>
                ) : isLoading ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="bx bxl-stripe" />
                    Continue to Stripe
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                disabled={isLoading}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Account exists - show status and actions
  return (
    <div className="stripe-connect-widget">
      {error && (
        <div className="admin-alert admin-alert-error">
          <i className="bx bx-error-circle" />
          {error}
        </div>
      )}

      {renderAccountStatus()}

      <div className="stripe-connect-actions">
        {account.accountStatus === "pending" && (
          <button
            type="button"
            onClick={handleContinueOnboarding}
            disabled={isLoading}
            className="admin-btn admin-btn-primary"
          >
            {isRedirecting ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                Redirecting to Stripe...
              </>
            ) : isLoading ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                Loading...
              </>
            ) : (
              <>
                <i className="bx bx-right-arrow-alt" />
                Complete Setup
              </>
            )}
          </button>
        )}

        {account.accountStatus === "restricted" && (
          <button
            type="button"
            onClick={handleContinueOnboarding}
            disabled={isLoading}
            className="admin-btn admin-btn-primary"
          >
            {isRedirecting ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                Redirecting to Stripe...
              </>
            ) : isLoading ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                Loading...
              </>
            ) : (
              <>
                <i className="bx bx-error" />
                Complete Verification
              </>
            )}
          </button>
        )}

        {account.accountStatus === "active" && (
          <button
            type="button"
            onClick={handleOpenDashboard}
            disabled={isLoading}
            className="admin-btn admin-btn-secondary"
          >
            {isLoading ? (
              <>
                <i className="bx bx-loader-alt bx-spin" />
                Loading...
              </>
            ) : (
              <>
                <i className="bx bx-link-external" />
                Open Stripe Dashboard
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
