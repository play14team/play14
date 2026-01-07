import { requireOrganizer } from "@/libs/auth"
import type { Metadata } from "next"
import Link from "next/link"
import PlayersList from "./players-list"

export const metadata: Metadata = {
  title: "Players",
}

export default async function PlayersPage() {
  await requireOrganizer()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Players</h1>
        <p>View and manage player profiles</p>
      </div>

      <div className="events-page-layout has-sidebar">
        <div className="events-page-main">
          <PlayersList />
        </div>

        <div className="events-page-sidebar">
          <div className="events-sidebar-content">
            <div className="events-sidebar-section">
              <h3>Quick Links</h3>
              <Link
                href="/players"
                className="admin-btn admin-btn-secondary admin-btn-block"
                target="_blank"
              >
                <i className="bx bx-link-external"></i>
                View Public Directory
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
