import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { requireOrganizer } from "@/libs/auth"
import { getLocationForEdit } from "../locations.action"
import LocationEditForm from "./location-edit-form"

export const metadata: Metadata = {
  title: "Edit Location",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LocationEditPage({ params }: PageProps) {
  await requireOrganizer()
  const { id } = await params

  const location = await getLocationForEdit(id)

  if (!location) {
    notFound()
  }

  return (
    <div className="admin-page admin-page-wide">
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
              <h1>Edit Location</h1>
              <p>{location.name}</p>
            </div>
          </div>
        </div>
      </div>

      <LocationEditForm location={location} />
    </div>
  )
}
