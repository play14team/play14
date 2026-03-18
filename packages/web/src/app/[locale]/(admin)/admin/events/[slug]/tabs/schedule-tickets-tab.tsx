"use client"

import { useTranslations } from "next-intl"
import type {
  HostStripeAccount,
  StripeAccountStatus,
} from "@/app/[locale]/(admin)/admin/stripe/stripe-connect.action"
import StripeAccountSelector from "@/components/admin/stripe-account-selector"
import type { DiscountCode } from "../discount-code.action"
import DiscountCodeEditor from "../discount-code-editor"
import type { EventForEdit, TicketingMode } from "../event-edit.action"
import type { TicketType } from "../ticket-type.action"
import TicketTypeEditor from "../ticket-type-editor"

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
  const t = useTranslations("adminEvents.scheduleTickets")

  return (
    <>
      {/* Ticketing Mode Section */}
      <div className="admin-form-section">
        <h2>{t("ticketingMode")}</h2>
        <p className="admin-form-section-description">{t("ticketingModeDescription")}</p>

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
                <i className="bx bx-x-circle" />
                <span>{t("noTicketing")}</span>
              </div>
              <p>{t("noTicketingDescription")}</p>
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
                <i className="bx bxl-stripe" />
                <span>{t("internalTicketing")}</span>
              </div>
              <p>{t("internalTicketingDescription")}</p>
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
                <i className="bx bx-link-external" />
                <span>{t("externalRegistration")}</span>
              </div>
              <p>{t("externalRegistrationDescription")}</p>
            </div>
          </label>
        </div>
      </div>

      {/* Internal Ticketing (Stripe) */}
      {ticketingMode === "internal" && (
        <>
          {/* Payment Settings Section */}
          <div className="admin-form-section">
            <h2>{t("paymentSettings")}</h2>
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
            <h2>{t("ticketTypes")}</h2>
            <p className="admin-form-section-description">{t("ticketTypesDescription")}</p>
            <TicketTypeEditor
              eventId={eventDocumentId}
              ticketTypes={ticketTypes}
              onUpdate={onUpdate}
            />
          </div>

          {/* Discount Codes Section */}
          <div className="admin-form-section">
            <h2>{t("discountCodes")}</h2>
            <p className="admin-form-section-description">{t("discountCodesDescription")}</p>
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
          <h2>{t("externalTitle")}</h2>
          <p className="admin-form-section-description">
            Configure where attendees should register for this event.
          </p>

          <div className="admin-form-group">
            <label htmlFor="registrationLink" className="admin-label">
              {t("registrationUrl")}
            </label>
            <input
              type="url"
              id="registrationLink"
              className="admin-input"
              placeholder={t("registrationUrlPlaceholder")}
              value={registrationLink}
              onChange={(e) => onRegistrationLinkChange(e.target.value)}
            />
            <p className="admin-help-text">
              The full URL where attendees can register (Eventbrite, Meetup, Google Form, etc.)
            </p>
          </div>

          <div className="admin-form-group">
            <label htmlFor="registrationWidgetCode" className="admin-label">
              {t("embedWidgetCode")} <span className="admin-label-optional">(optional)</span>
            </label>
            <textarea
              id="registrationWidgetCode"
              className="admin-textarea"
              rows={6}
              placeholder={t("embedWidgetPlaceholder")}
              value={registrationWidgetCode}
              onChange={(e) => onRegistrationWidgetCodeChange(e.target.value)}
            />
            <p className="admin-help-text">{t("embedWidgetHelp")}</p>
          </div>
        </div>
      )}
    </>
  )
}
