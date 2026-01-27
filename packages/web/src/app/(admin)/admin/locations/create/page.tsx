import type { Metadata } from "next"
import Link from "next/link"
import { requireOrganizer } from "@/libs/auth"
import LocationCreateForm from "./location-create-form"

export const metadata: Metadata = {
  title: "Create Location",
}

export default async function LocationCreatePage() {
  await requireOrganizer()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <div className="admin-page-header-title-with-back">
            <Link
              href="/admin/locations"
              className="admin-btn admin-btn-icon admin-btn-secondary"
              title="Back to Locations"
            >
              <i className="bx bx-arrow-back" />
            </Link>
            <div>
              <h1>Create Location</h1>
              <p>Add a new city or region for events</p>
            </div>
          </div>
        </div>
      </div>

      <LocationCreateForm />
    </div>
  )
}
