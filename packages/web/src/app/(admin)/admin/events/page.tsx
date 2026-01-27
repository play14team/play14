import type { Metadata } from "next"
import { requireAuth } from "@/libs/auth"
import EventsPageContent from "./events-page-content"

export const metadata: Metadata = {
  title: "Events",
}

export default async function EventsPage() {
  // Require authentication with linked player
  const session = await requireAuth("/admin/events")

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Events</h1>
        <p>Manage and track your event participation</p>
      </div>

      <EventsPageContent user={session.user} />
    </div>
  )
}
