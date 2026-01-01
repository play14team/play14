import { requireOrganizer } from "@/libs/auth"
import type { Metadata } from "next"
import PlayersList from "./players-list"

export const metadata: Metadata = {
  title: "Players",
}

export default async function PlayersPage() {
  await requireOrganizer()

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-header-content">
          <h1>Players</h1>
          <p>View and manage player profiles</p>
        </div>
      </div>

      <PlayersList />
    </div>
  )
}
