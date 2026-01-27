import type { Metadata } from "next"
import { getStripeAccountStatus } from "@/app/(admin)/admin/stripe/stripe-connect.action"
import { PlayerForm } from "@/components/admin/player-form"
import { getPlayerByDocumentId } from "@/libs/api/players"
import { requirePlayer } from "@/libs/auth"

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

  // Always use wide layout for profile page to accommodate the 3-column header layout
  const pageClassName = "admin-page admin-page-wide"

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
