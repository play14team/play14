import { requireOrganizer } from "@/libs/auth"
import type { Metadata } from "next"
import Link from "next/link"
import VenueCreateForm from "./venue-create-form"

export const metadata: Metadata = {
  title: "Create Venue",
}

export default async function VenueCreatePage() {
  await requireOrganizer()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <div className="admin-page-header-title-with-back">
            <Link
              href="/admin/venues"
              className="admin-btn admin-btn-icon admin-btn-secondary"
              title="Back to Venues"
            >
              <i className="bx bx-arrow-back" />
            </Link>
            <div>
              <h1>Create Venue</h1>
              <p>Add a new hosting facility or organization</p>
            </div>
          </div>
        </div>
      </div>

      <VenueCreateForm />
    </div>
  )
}
