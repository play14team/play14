import { requireOrganizer } from "@/libs/auth"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getVenueForEdit } from "../venues.action"
import VenueEditForm from "./venue-edit-form"

export const metadata: Metadata = {
  title: "Edit Venue",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VenueEditPage({ params }: PageProps) {
  await requireOrganizer()
  const { id } = await params

  const venue = await getVenueForEdit(id)

  if (!venue) {
    notFound()
  }

  return (
    <div className="admin-page admin-page-wide">
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
              <h1>Edit Venue</h1>
              <p>{venue.name}</p>
            </div>
          </div>
        </div>
      </div>

      <VenueEditForm venue={venue} />
    </div>
  )
}
