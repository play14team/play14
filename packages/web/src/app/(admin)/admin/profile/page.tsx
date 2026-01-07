import { requirePlayer } from "@/libs/auth"
import { getPlayerByDocumentId } from "@/libs/api/players"
import { PlayerForm } from "@/components/admin/player-form"
import { getStripeAccountStatus } from "@/app/(admin)/admin/stripe/stripe-connect.action"
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

  // Fetch Stripe account status for organizers (Host, Mentor, Founder)
  const isOrganizer = player.position !== "Player"
  const stripeAccount = isOrganizer ? await getStripeAccountStatus() : null

  // Use wide layout for organizers (who see tabs) to have consistent layout
  const pageClassName = isOrganizer ? "admin-page admin-page-wide" : "admin-page"

  return (
    <div className={pageClassName}>
      <div className="admin-page-header">
        <h1>My Profile</h1>
        <p>Update your player profile information</p>
      </div>

      <PlayerForm player={player} mode="self" stripeAccount={stripeAccount} />
    </div>
  )
}
