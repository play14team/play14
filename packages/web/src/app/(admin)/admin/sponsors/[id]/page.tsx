import { requireOrganizer } from "@/libs/auth"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getSponsorForEdit } from "../sponsors.action"
import SponsorEditForm from "./sponsor-edit-form"

export const metadata: Metadata = {
  title: "Edit Sponsor",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SponsorEditPage({ params }: PageProps) {
  await requireOrganizer()
  const { id } = await params

  const sponsor = await getSponsorForEdit(id)

  if (!sponsor) {
    notFound()
  }

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <div className="admin-page-header-title-with-back">
            <Link
              href="/admin/sponsors"
              className="admin-btn admin-btn-icon admin-btn-secondary"
              title="Back to Sponsors"
            >
              <i className="bx bx-arrow-back" />
            </Link>
            <div>
              <h1>Edit Sponsor</h1>
              <p>{sponsor.name}</p>
            </div>
          </div>
        </div>
      </div>

      <SponsorEditForm sponsor={sponsor} />
    </div>
  )
}
