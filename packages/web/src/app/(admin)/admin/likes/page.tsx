import type { Metadata } from "next"
import Link from "next/link"
import { requireFounder } from "@/libs/auth"
import LikedItemsList from "./liked-items-list"

export const metadata: Metadata = {
  title: "Things we like",
}

export default async function LikesPage() {
  await requireFounder()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Things we like</h1>
        <p>Manage showcase items - things the community recommends</p>
      </div>

      <div className="events-page-layout has-sidebar">
        <div className="events-page-main">
          <LikedItemsList />
        </div>

        <div className="events-page-sidebar">
          <div className="events-sidebar-content">
            <div className="events-sidebar-section">
              <h3>Quick Actions</h3>
              <Link
                href="/admin/likes/create"
                className="admin-btn admin-btn-primary admin-btn-block"
              >
                <i className="bx bx-plus" />
                Add New Item
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
