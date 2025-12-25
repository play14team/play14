import { requirePlayer } from "@/libs/auth"
import { getPlayerByDocumentId } from "@/libs/api/players"
import PlayerProfileForm from "@/components/admin/player-profile-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Edit Profile",
}

export default async function ProfilePage() {
  const { player: sessionPlayer } = await requirePlayer("/admin/profile")

  // Fetch full player data with all fields
  const player = await getPlayerByDocumentId(sessionPlayer.documentId!)

  if (!player) {
    return (
      <div className="admin-page">
        <h1>Profile Not Found</h1>
        <p>Unable to load your player profile. Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Edit Profile</h1>
        <p>Update your player profile information</p>
      </div>

      <PlayerProfileForm player={player} />
    </div>
  )
}
