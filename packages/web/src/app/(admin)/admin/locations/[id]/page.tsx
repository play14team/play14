import { requireOrganizer } from "@/libs/auth"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
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
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <h1>Edit Location</h1>
          <p>{location.name}</p>
        </div>
        <Link href="/admin/locations" className="admin-btn admin-btn-secondary">
          <i className="bx bx-arrow-back"></i>
          Back to Locations
        </Link>
      </div>

      <LocationEditForm location={location} />
    </div>
  )
}
