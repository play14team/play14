import type { Metadata } from "next"
import { requireAuth } from "@/libs/auth"
import PlayerLinkingFlow from "./_components/player-linking-flow"

export const metadata: Metadata = {
  title: "Link Your Profile | #play14",
}

export default async function NoPlayerPage() {
  const session = await requireAuth()

  return (
    <div className="admin-no-player">
      <div className="admin-no-player-card">
        <PlayerLinkingFlow userEmail={session.user.email} userName={session.user.username} />
      </div>
    </div>
  )
}
