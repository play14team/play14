import { requireOrganizer } from "@/libs/auth"
import type { Metadata } from "next"
import Link from "next/link"
import VenuesList from "./venues-list"

export const metadata: Metadata = {
  title: "Venues",
}

export default async function VenuesPage() {
  await requireOrganizer()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Venues</h1>
        <p>Manage hosting facilities and organizations for events</p>
      </div>

      <div className="events-page-layout has-sidebar">
        <div className="events-page-main">
          <VenuesList />
        </div>

        <div className="events-page-sidebar">
          <div className="events-sidebar-content">
            <div className="events-sidebar-section">
              <h3>Quick Actions</h3>
              <Link
                href="/admin/venues/create"
                className="admin-btn admin-btn-primary admin-btn-block"
              >
                <i className="bx bx-plus" />
                Create Venue
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
