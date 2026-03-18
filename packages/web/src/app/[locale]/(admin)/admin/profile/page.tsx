import { getTranslations } from "next-intl/server"
import { getStripeAccountStatus } from "@/app/[locale]/(admin)/admin/stripe/stripe-connect.action"
import { PlayerForm } from "@/components/admin/player-form"
import { getMySettings } from "@/components/admin/player-form/settings.action"
import { getPlayerByDocumentId } from "@/libs/api/players"
import { requirePlayer } from "@/libs/auth"

export async function generateMetadata() {
  const t = await getTranslations("adminMisc.profile")
  return {
    title: t("title"),
  }
}

export default async function ProfilePage() {
  const t = await getTranslations("adminMisc.profile")
  const { player: sessionPlayer } = await requirePlayer("/admin/profile")

  // Fetch full player data with all fields
  const player = await getPlayerByDocumentId(sessionPlayer.documentId!)

  if (!player) {
    return (
      <div className="admin-page">
        <h1>{t("notFound")}</h1>
        <p>{t("notFoundDescription")}</p>
      </div>
    )
  }

  // Fetch Stripe account status and settings in parallel
  const isOrganizer = player.position !== "Player"
  const [stripeAccount, settingsData] = await Promise.all([
    isOrganizer ? getStripeAccountStatus() : null,
    getMySettings(),
  ])

  // Always use wide layout for profile page to accommodate the 3-column header layout
  const pageClassName = "admin-page admin-page-wide"

  return (
    <div className={pageClassName}>
      <div className="admin-page-header">
        <h1>{t("heading")}</h1>
        <p>{t("subtitle")}</p>
      </div>

      <PlayerForm
        player={player}
        mode="self"
        stripeAccount={stripeAccount}
        settingsData={settingsData}
      />
    </div>
  )
}
