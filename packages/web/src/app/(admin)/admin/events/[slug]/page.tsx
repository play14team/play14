import { requireOrganizer } from "@/libs/auth"
import { notFound } from "next/navigation"
import Link from "next/link"
import EventEditForm from "./event-edit-form"
import {
  getEventForEdit,
  getLocations,
  getVenues,
  getOrganizers,
} from "./event-edit.action"
import {
  getStripeAccountStatus,
  getEventHostAccounts,
} from "@/app/(admin)/admin/stripe/stripe-connect.action"
import { getEventDiscountCodes } from "./discount-code.action"
import { getBudgetItems } from "./budget.action"
import { getResultItems } from "./results.action"
import { getRevenueAnalytics } from "./revenue-analytics.action"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Edit Event | #play14",
  robots: "noindex, nofollow",
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EventEditPage({ params }: PageProps) {
  const session = await requireOrganizer()
  const { slug } = await params

  const [event, locations, venues, organizers, playerStripeAccount] =
    await Promise.all([
      getEventForEdit(slug),
      getLocations(),
      getVenues(),
      getOrganizers(),
      getStripeAccountStatus(),
    ])

  if (!event) {
    notFound()
  }

  // Verify user is host/mentor of this event or is Founder
  const isEventOrganizer =
    event.hosts?.some((h) => h.documentId === session.player.documentId) ||
    event.mentors?.some((m) => m.documentId === session.player.documentId) ||
    session.player.position === "Founder"

  if (!isEventOrganizer) {
    notFound()
  }

  // Fetch host accounts, discount codes, budget/result items, and revenue after we have the event (needs documentId)
  const [hostAccounts, discountCodesResult, budgetItemsResult, resultItemsResult, revenueAnalytics] = await Promise.all([
    getEventHostAccounts(event.documentId),
    getEventDiscountCodes(event.documentId),
    getBudgetItems(event.documentId),
    getResultItems(event.documentId),
    getRevenueAnalytics(event.documentId),
  ])

  const discountCodes = discountCodesResult.success ? discountCodesResult.data || [] : []
  const budgetItems = budgetItemsResult.success ? budgetItemsResult.data || [] : []
  const resultItems = resultItemsResult.success ? resultItemsResult.data || [] : []
  const ticketRevenue = revenueAnalytics?.summary?.netRevenue ?? 0

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <div className="admin-page-header-title-with-back">
            <Link
              href="/admin/events"
              className="admin-btn admin-btn-icon admin-btn-secondary"
              title="Back to Events"
            >
              <i className="bx bx-arrow-back"></i>
            </Link>
            <div>
              <h1>Edit Event</h1>
              <p>{event.name}</p>
            </div>
          </div>
        </div>
      </div>

      <EventEditForm
        event={event}
        locations={locations}
        venues={venues}
        organizers={organizers}
        hostAccounts={hostAccounts}
        playerStripeAccount={playerStripeAccount}
        discountCodes={discountCodes}
        budgetItems={budgetItems}
        resultItems={resultItems}
        ticketRevenue={ticketRevenue}
      />
    </div>
  )
}
