import type { Metadata } from "next"
import Link from "next/link"
import { requireOrganizer } from "@/libs/auth"
import SponsorsList from "./sponsors-list"

export const metadata: Metadata = {
  title: "Sponsors",
}

export default async function SponsorsPage() {
  await requireOrganizer()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Sponsors</h1>
        <p>Manage sponsors and partners for events</p>
      </div>

      <div className="events-page-layout has-sidebar">
        <div className="events-page-main">
          <SponsorsList />
        </div>

        <div className="events-page-sidebar">
          <div className="events-sidebar-content">
            <div className="events-sidebar-section">
              <h3>Quick Actions</h3>
              <Link
                href="/admin/sponsors/create"
                className="admin-btn admin-btn-primary admin-btn-block"
              >
                <i className="bx bx-plus" />
                Create Sponsor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
