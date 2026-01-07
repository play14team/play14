import { requireOrganizer } from "@/libs/auth"
import { notFound } from "next/navigation"
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

  // Fetch host accounts after we have the event (needs documentId)
  const hostAccounts = await getEventHostAccounts(event.documentId)

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <h1>Edit Event</h1>
        <p>{event.name}</p>
      </div>

      <EventEditForm
        event={event}
        locations={locations}
        venues={venues}
        organizers={organizers}
        hostAccounts={hostAccounts}
        playerStripeAccount={playerStripeAccount}
      />
    </div>
  )
}
