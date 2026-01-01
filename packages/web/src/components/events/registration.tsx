"use client"

import Link from "next/link"
import { Event } from "@/models/strapi"
import HtmlContent from "../layout/html-content"
import { TicketPurchaseFlow } from "../tickets"

interface EventRegistrationProps {
  event: Event
}

/**
 * Unified registration component that handles multiple registration methods:
 * - Stripe ticketing (when ticketingEnabled && paymentProvider === "stripe")
 * - Humanitix widget (when paymentProvider === "humanitix" && widgetCode exists)
 * - External registration link (when registration.link exists)
 * - Embedded widget code (when registration.widgetCode exists)
 */
export default function EventRegistration({ event }: EventRegistrationProps) {
  const eventData = event as any // Type assertion for new fields
  const hasStripeTicketing =
    eventData.ticketingEnabled && eventData.paymentProvider === "stripe"
  const hasHumanitixWidget =
    eventData.paymentProvider === "humanitix" && event.registration?.widgetCode
  const hasExternalLink = event.registration?.link
  const hasWidgetCode =
    event.registration?.widgetCode && !hasHumanitixWidget

  // No registration options available
  if (
    !hasStripeTicketing &&
    !hasHumanitixWidget &&
    !hasExternalLink &&
    !hasWidgetCode
  ) {
    return null
  }

  return (
    <div className="row mt-4">
      <div className="col-12">
        <section
          className="events-registration-section"
          aria-labelledby="registration-heading"
        >
          <h3 id="registration-heading" className="mb-3">
            Registration
          </h3>

          {/* Stripe ticketing - show ticket selector */}
          {hasStripeTicketing && (
            <div className="registration-tickets mb-4">
              <TicketPurchaseFlow eventId={event.documentId!} />
            </div>
          )}

          {/* Humanitix or other widget embed */}
          {(hasHumanitixWidget || hasWidgetCode) && (
            <div className="registration-widget mb-4">
              <HtmlContent>{event.registration!.widgetCode!}</HtmlContent>
            </div>
          )}

          {/* External registration link (shown as prominent button if no other options) */}
          {hasExternalLink && !hasStripeTicketing && !hasHumanitixWidget && (
            <div className="registration-link">
              <Link
                href={event.registration!.link!}
                target="_blank"
                rel="noopener noreferrer"
                className="default-btn"
              >
                <i className="flaticon-user"></i>
                Register Now
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
