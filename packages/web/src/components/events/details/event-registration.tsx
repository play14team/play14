"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import type { Event } from "@/models/strapi"
import HtmlContent from "../../layout/html-content"
import { TicketPurchaseFlow } from "../../tickets"

interface EventRegistrationProps {
  event: Event
}

export default function EventRegistration({ event }: EventRegistrationProps) {
  const t = useTranslations("events")
  const ticketingMode = event.ticketingMode || "none"

  // No registration when ticketing is disabled
  if (ticketingMode === "none") {
    return null
  }

  // Internal ticketing via Stripe
  if (ticketingMode === "internal") {
    return (
      <section className="event-profile-registration" aria-labelledby="registration-heading">
        <h2 id="registration-heading" className="event-profile-registration__title">
          <i className="bx bx-purchase-tag" />
          {t("details.getYourTickets")}
        </h2>
        <div className="event-profile-registration__content">
          <TicketPurchaseFlow eventId={event.documentId!} />
        </div>
      </section>
    )
  }

  // External ticketing
  const hasExternalLink = event.registration?.link
  const hasWidgetCode = event.registration?.widgetCode

  if (!hasExternalLink && !hasWidgetCode) {
    return null
  }

  return (
    <section className="event-profile-registration" aria-labelledby="registration-heading">
      <h2 id="registration-heading" className="event-profile-registration__title">
        <i className="bx bx-user-plus" />
        {t("details.registerForEvent")}
      </h2>

      <div className="event-profile-registration__content">
        {/* External widget embed (Eventbrite, etc.) */}
        {hasWidgetCode && (
          <div className="event-profile-registration__widget">
            <HtmlContent>{event.registration!.widgetCode!}</HtmlContent>
          </div>
        )}

        {/* External registration link */}
        {hasExternalLink && (
          <div className="event-profile-registration__link">
            <Link
              href={event.registration!.link!}
              target="_blank"
              rel="noopener noreferrer"
              className="event-profile-info__action-btn event-profile-info__action-btn--primary"
            >
              <i className="bx bx-user-plus" />
              {t("details.registerNow")}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
