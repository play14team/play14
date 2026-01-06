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
        <div className="admin-page-header-content">
          <h1>Venues</h1>
          <p>Manage hosting facilities and organizations for events</p>
        </div>
        <Link href="/admin/venues/create" className="admin-btn admin-btn-primary">
          <i className="bx bx-plus"></i>
          Create Venue
        </Link>
      </div>

      <VenuesList />
    </div>
  )
}
