import { requireOrganizer } from "@/libs/auth"
import type { Metadata } from "next"
import PlayersPageContent from "./players-page-content"

export const metadata: Metadata = {
  title: "Players",
}

export default async function PlayersPage() {
  await requireOrganizer()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Players</h1>
        <p>View and manage player profiles</p>
      </div>

      <PlayersPageContent />
    </div>
  )
}
