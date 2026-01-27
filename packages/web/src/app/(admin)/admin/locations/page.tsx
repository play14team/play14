import type { Metadata } from "next"
import Link from "next/link"
import { requireOrganizer } from "@/libs/auth"
import LocationsList from "./locations-list"

export const metadata: Metadata = {
  title: "Event Locations",
}

export default async function LocationsPage() {
  await requireOrganizer()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Event Locations</h1>
        <p>Manage cities and regions where events take place</p>
      </div>

      <div className="events-page-layout has-sidebar">
        <div className="events-page-main">
          <LocationsList />
        </div>

        <div className="events-page-sidebar">
          <div className="events-sidebar-content">
            <div className="events-sidebar-section">
              <h3>Quick Actions</h3>
              <Link
                href="/admin/locations/create"
                className="admin-btn admin-btn-primary admin-btn-block"
              >
                <i className="bx bx-plus" />
                Create Location
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
