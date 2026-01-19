"use client"

import type { StripeAccountStatus } from "@/app/(admin)/admin/stripe/stripe-connect.action"
import StripeConnect from "@/components/admin/stripe-connect"

interface StripeTabProps {
  account: StripeAccountStatus | null
}

export default function StripeTab({ account }: StripeTabProps) {
  return (
    <>
      <div className="admin-form-section">
        <h2>Payment Account</h2>
        <p className="admin-form-section-description">
          Connect your Stripe account to receive payments from event attendees.
        </p>
        <StripeConnect account={account} returnPath="/admin/profile" />
      </div>

      <div className="admin-form-section admin-info-section">
        <h2>How it works</h2>
        <div className="stripe-info-content">
          <div className="stripe-info-item">
            <i className="bx bx-link" />
            <div>
              <h4>Connect your account</h4>
              <p>Set up a Stripe Express account to receive payments directly.</p>
            </div>
          </div>
          <div className="stripe-info-item">
            <i className="bx bx-calendar-event" />
            <div>
              <h4>Link to events</h4>
              <p>Enable online ticketing for your events by linking your Stripe account.</p>
            </div>
          </div>
          <div className="stripe-info-item">
            <i className="bx bx-credit-card" />
            <div>
              <h4>Get paid</h4>
              <p>Payments from attendees go directly to your account, minus processing fees.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
