import Link from "next/link"
import { requirePlayer } from "@/libs/auth"
import Avatar from "@/components/ui/avatar"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Dashboard",
}

export default async function AdminDashboardPage() {
  const { user, player } = await requirePlayer("/admin")

  return (
    <div className="admin-dashboard">
      <div className="admin-welcome">
        <Avatar
          src={player.avatar?.url}
          alt={player.name}
          fallback={player.name}
          size="xl"
        />
        <div className="admin-welcome-text">
          <h1>Welcome back, {player.name}!</h1>
          <p>
            You are logged in as <strong>{user.email}</strong>
          </p>
          {player.position && (
            <span className="admin-position-badge">{player.position}</span>
          )}
        </div>
      </div>

      <div className="admin-quick-links">
        <h2>Quick Actions</h2>
        <div className="admin-cards">
          <Link href={`/players/${player.slug}`} className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-user"></i>
            </div>
            <div className="admin-card-content">
              <h3>View Profile</h3>
              <p>See your public player profile</p>
            </div>
          </Link>

          <Link href="/events" className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-calendar"></i>
            </div>
            <div className="admin-card-content">
              <h3>Browse Events</h3>
              <p>Discover upcoming #play14 events</p>
            </div>
          </Link>

          <Link href="/games" className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-game"></i>
            </div>
            <div className="admin-card-content">
              <h3>Game Catalog</h3>
              <p>Explore our game library</p>
            </div>
          </Link>

          <Link href="/players" className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-group"></i>
            </div>
            <div className="admin-card-content">
              <h3>Community</h3>
              <p>Connect with other players</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="admin-info">
        <h2>Coming Soon</h2>
        <p>
          Content management features are being developed. Soon you&apos;ll be able
          to manage events, update your profile, and more directly from this
          dashboard.
        </p>
      </div>
    </div>
  )
}
