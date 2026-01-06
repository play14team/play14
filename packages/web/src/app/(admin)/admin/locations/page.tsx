import { requireOrganizer } from "@/libs/auth"
import type { Metadata } from "next"
import Link from "next/link"
import LocationsList from "./locations-list"

export const metadata: Metadata = {
  title: "Event Locations",
}

export default async function LocationsPage() {
  await requireOrganizer()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <h1>Event Locations</h1>
          <p>Manage cities and regions where events take place</p>
        </div>
        <Link href="/admin/locations/create" className="admin-btn admin-btn-primary">
          <i className="bx bx-plus"></i>
          Create Location
        </Link>
      </div>

      <LocationsList />
    </div>
  )
}
