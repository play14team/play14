"use client"

import StripeAccountSelector from "@/components/admin/stripe-account-selector"
import TicketTypeEditor from "../ticket-type-editor"
import DiscountCodeEditor from "../discount-code-editor"
import type { TicketType } from "../ticket-type.action"
import type { DiscountCode } from "../discount-code.action"
import type { EventForEdit, TicketingMode } from "../event-edit.action"
import type {
  StripeAccountStatus,
  HostStripeAccount,
} from "@/app/(admin)/admin/stripe/stripe-connect.action"

interface TicketsTabProps {
  eventDocumentId: string
  ticketTypes: TicketType[]
  discountCodes: DiscountCode[]
  stripeAccount: EventForEdit["stripeAccount"]
  hostAccounts: HostStripeAccount[]
  playerAccount: StripeAccountStatus | null
  onUpdate: () => void
  // Ticketing mode state
  ticketingMode: TicketingMode
  onTicketingModeChange: (mode: TicketingMode) => void
  registrationLink: string
  onRegistrationLinkChange: (value: string) => void
  registrationWidgetCode: string
  onRegistrationWidgetCodeChange: (value: string) => void
}

export default function TicketsTab({
  eventDocumentId,
  ticketTypes,
  discountCodes,
  stripeAccount,
  hostAccounts,
  playerAccount,
  onUpdate,
  ticketingMode,
  onTicketingModeChange,
  registrationLink,
  onRegistrationLinkChange,
  registrationWidgetCode,
  onRegistrationWidgetCodeChange,
}: TicketsTabProps) {
  return (
    <>
      {/* Ticketing Mode Section */}
      <div className="admin-form-section">
        <h2>Ticketing Mode</h2>
        <p className="admin-form-section-description">
          Choose how attendees will register for this event.
        </p>

        <div className="admin-radio-group">
          <label className="admin-radio-card">
            <input
              type="radio"
              name="ticketingMode"
              value="none"
              checked={ticketingMode === "none"}
              onChange={() => onTicketingModeChange("none")}
            />
            <div className="admin-radio-card-content">
              <div className="admin-radio-card-header">
                <i className="bx bx-x-circle"></i>
                <span>No Ticketing</span>
              </div>
              <p>Attendees cannot register online. Registration will be handled manually or the event is free and open to all.</p>
            </div>
          </label>

          <label className="admin-radio-card">
            <input
              type="radio"
              name="ticketingMode"
              value="internal"
              checked={ticketingMode === "internal"}
              onChange={() => onTicketingModeChange("internal")}
            />
            <div className="admin-radio-card-content">
              <div className="admin-radio-card-header">
                <i className="bx bxl-stripe"></i>
                <span>Internal Ticketing (Stripe)</span>
              </div>
              <p>Use our built-in ticketing system powered by Stripe. Manage ticket types, pricing, and receive payments directly.</p>
            </div>
          </label>

          <label className="admin-radio-card">
            <input
              type="radio"
              name="ticketingMode"
              value="external"
              checked={ticketingMode === "external"}
              onChange={() => onTicketingModeChange("external")}
            />
            <div className="admin-radio-card-content">
              <div className="admin-radio-card-header">
                <i className="bx bx-link-external"></i>
                <span>External Registration</span>
              </div>
              <p>Use an external platform (Eventbrite, Meetup, etc.) for registration. Provide a link or embed their widget.</p>
            </div>
          </label>
        </div>

      </div>

      {/* Internal Ticketing (Stripe) */}
      {ticketingMode === "internal" && (
        <>
          {/* Payment Settings Section */}
          <div className="admin-form-section">
            <h2>Payment Settings</h2>
            <p className="admin-form-section-description">
              Connect a Stripe account to receive payments from attendees.
            </p>
            <StripeAccountSelector
              eventId={eventDocumentId}
              currentAccount={stripeAccount}
              hostAccounts={hostAccounts}
              playerAccount={playerAccount}
              onUpdate={onUpdate}
            />
          </div>

          {/* Ticket Types Section */}
          <div className="admin-form-section">
            <h2>Ticket Types</h2>
            <p className="admin-form-section-description">
              Configure ticket types and pricing for this event.
            </p>
            <TicketTypeEditor
              eventId={eventDocumentId}
              ticketTypes={ticketTypes}
              onUpdate={onUpdate}
            />
          </div>

          {/* Discount Codes Section */}
          <div className="admin-form-section">
            <h2>Discount Codes</h2>
            <p className="admin-form-section-description">
              Create promotional codes to offer discounts on ticket purchases.
            </p>
            <DiscountCodeEditor
              eventId={eventDocumentId}
              discountCodes={discountCodes}
              onUpdate={onUpdate}
            />
          </div>
        </>
      )}

      {/* External Registration */}
      {ticketingMode === "external" && (
        <div className="admin-form-section">
          <h2>External Registration</h2>
          <p className="admin-form-section-description">
            Configure where attendees should register for this event.
          </p>

          <div className="admin-form-group">
            <label htmlFor="registrationLink" className="admin-label">
              Registration URL
            </label>
            <input
              type="url"
              id="registrationLink"
              className="admin-input"
              placeholder="https://www.eventbrite.com/e/your-event"
              value={registrationLink}
              onChange={(e) => onRegistrationLinkChange(e.target.value)}
            />
            <p className="admin-help-text">
              The full URL where attendees can register (Eventbrite, Meetup, Google Form, etc.)
            </p>
          </div>

          <div className="admin-form-group">
            <label htmlFor="registrationWidgetCode" className="admin-label">
              Embed Widget Code <span className="admin-label-optional">(optional)</span>
            </label>
            <textarea
              id="registrationWidgetCode"
              className="admin-textarea"
              rows={6}
              placeholder="<div id='eventbrite-widget-container'></div>&#10;<script src='https://www.eventbrite.com/static/widgets/...'></script>"
              value={registrationWidgetCode}
              onChange={(e) => onRegistrationWidgetCodeChange(e.target.value)}
            />
            <p className="admin-help-text">
              Paste the HTML/JavaScript code provided by your ticketing platform to embed their registration widget directly on the event page.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
