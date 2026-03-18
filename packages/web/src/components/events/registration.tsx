"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import type { Event } from "@/models/strapi"
import HtmlContent from "../layout/html-content"
import { TicketPurchaseFlow } from "../tickets"

interface EventRegistrationProps {
  event: Event
}

/**
 * Unified registration component that handles multiple registration methods:
 * - Stripe ticketing (when ticketingMode === "internal")
 * - External registration (when ticketingMode === "external" with link or widgetCode)
 */
export default function EventRegistration({ event }: EventRegistrationProps) {
  const t = useTranslations("tickets")
  const ticketingMode = event.ticketingMode || "none"

  // No registration when ticketing is disabled
  if (ticketingMode === "none") {
    return null
  }

  // Internal ticketing via Stripe
  if (ticketingMode === "internal") {
    return (
      <div className="row mt-4">
        <div className="col-12">
          <section className="events-registration-section" aria-labelledby="registration-heading">
            <h3 id="registration-heading" className="mb-3" style={{ scrollMarginTop: "150px" }}>
              {t("registration")}
            </h3>
            <div className="registration-tickets mb-4">
              <TicketPurchaseFlow eventId={event.documentId!} />
            </div>
          </section>
        </div>
      </div>
    )
  }

  // External ticketing
  const hasExternalLink = event.registration?.link
  const hasWidgetCode = event.registration?.widgetCode

  if (!hasExternalLink && !hasWidgetCode) {
    return null
  }

  return (
    <div className="row mt-4">
      <div className="col-12">
        <section className="events-registration-section" aria-labelledby="registration-heading">
          <h3 id="registration-heading" className="mb-3" style={{ scrollMarginTop: "150px" }}>
            Registration
          </h3>

          {/* External widget embed (Eventbrite, etc.) */}
          {hasWidgetCode && (
            <div className="registration-widget mb-4">
              <HtmlContent>{event.registration!.widgetCode!}</HtmlContent>
            </div>
          )}

          {/* External registration link */}
          {hasExternalLink && (
            <div className="registration-link">
              <Link
                href={event.registration!.link!}
                target="_blank"
                rel="noopener noreferrer"
                className="default-btn"
              >
                <i className="flaticon-user" />
                {t("registerNow")}
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
