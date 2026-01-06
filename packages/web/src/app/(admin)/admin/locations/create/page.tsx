import { requireOrganizer } from "@/libs/auth"
import type { Metadata } from "next"
import Link from "next/link"
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
          <h1>Create Location</h1>
          <p>Add a new city or region for events</p>
        </div>
        <Link href="/admin/locations" className="admin-btn admin-btn-secondary">
          <i className="bx bx-arrow-back"></i>
          Back to Locations
        </Link>
      </div>

      <LocationCreateForm />
    </div>
  )
}
