import { requireOrganizer } from "@/libs/auth"
import type { Metadata } from "next"
import Link from "next/link"
import SponsorCreateForm from "./sponsor-create-form"

export const metadata: Metadata = {
  title: "Create Sponsor",
}

export default async function SponsorCreatePage() {
  await requireOrganizer()

  return (
    <div className="admin-page">
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
              <h1>Create Sponsor</h1>
              <p>Add a new sponsor or partner</p>
            </div>
          </div>
        </div>
      </div>

      <SponsorCreateForm />
    </div>
  )
}
