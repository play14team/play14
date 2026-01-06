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
          <h1>Create Venue</h1>
          <p>Add a new hosting facility or organization</p>
        </div>
        <Link href="/admin/venues" className="admin-btn admin-btn-secondary">
          <i className="bx bx-arrow-back"></i>
          Back to Venues
        </Link>
      </div>

      <VenueCreateForm />
    </div>
  )
}
