import { redirect } from "next/navigation"
import StripeConnect from "@/components/admin/stripe-connect"
import { getAuthCookie } from "@/libs/auth"
import { getStripeAccountStatus } from "./stripe-connect.action"

export const metadata = {
  title: "Stripe Account | #play14 Admin",
  description: "Manage your Stripe account for receiving event payments",
}

export default async function StripeAdminPage() {
  const jwt = await getAuthCookie()

  if (!jwt) {
    redirect("/auth/login?redirect=/admin/stripe")
  }

  const account = await getStripeAccountStatus()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <h1>Stripe Account</h1>
          <p>Connect your Stripe account to receive payments from event attendees.</p>
        </div>
      </div>

      <div className="admin-form">
        <div className="admin-form-section">
          <h2>Payment Account</h2>
          <StripeConnect account={account} returnPath="/admin/stripe" />
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
      </div>
    </div>
  )
}
