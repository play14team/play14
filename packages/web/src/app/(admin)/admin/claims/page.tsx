import { requireFounder } from "@/libs/auth"
import ClaimsList from "./claims-list"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Manage Claims",
}

export default async function ClaimsPage() {
  // Only Founders can access this page
  await requireFounder("/admin/claims")

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Player Claims</h1>
        <p>Review and manage player profile claim requests</p>
      </div>

      <ClaimsList />
    </div>
  )
}
