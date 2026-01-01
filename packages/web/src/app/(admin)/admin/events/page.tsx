import { requireAuth } from "@/libs/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import EventsList from "./events-list"

export const metadata: Metadata = {
  title: "My Events",
}

export default async function EventsPage() {
  // Require authentication with linked player
  const session = await requireAuth("/admin/events")

  // Check if user is a host, mentor, or founder
  const position = session.user.player?.position
  const isOrganizer =
    position === "Host" || position === "Mentor" || position === "Founder"

  if (!isOrganizer) {
    // If not an organizer, redirect to admin home
    redirect("/admin")
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <h1>My Events</h1>
          <p>View and manage events you organize</p>
        </div>
        <Link href="/admin/events/create" className="admin-btn admin-btn-primary">
          <i className="bx bx-plus"></i>
          Create Event
        </Link>
      </div>

      <EventsList />
    </div>
  )
}
