import type { Metadata } from "next"
import Link from "next/link"
import { getMyOrders } from "@/components/tickets/purchase.action"
import Avatar from "@/components/ui/avatar"
import { requirePlayer } from "@/libs/auth"
import { getMyAttendedEvents, getMyEvents } from "./events/events.action"
import styles from "./page.module.scss"

export const metadata: Metadata = {
  title: "Admin Dashboard",
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function AdminDashboardPage() {
  const { user, player } = await requirePlayer("/admin")

  // Determine user role
  const isFounder = player.position === "Founder"
  const isMentor = player.position === "Mentor"
  const isHost = player.position === "Host"
  const isOrganizer = isHost || isMentor || isFounder

  // Fetch dashboard data
  const [myEventsData, attendedEventsData, ordersData] = await Promise.all([
    isOrganizer ? getMyEvents() : Promise.resolve([]),
    getMyAttendedEvents(),
    getMyOrders(),
  ])

  const myEvents = myEventsData || []
  const attendedEvents = attendedEventsData.events || []
  const orders = ordersData || []

  // Calculate stats
  const upcomingEvents = myEvents.filter((e) => new Date(e.start) > new Date())
  const pastAttendedEvents = attendedEvents.filter((e) => new Date(e.end) < new Date())
  const paidOrders = orders.filter((o) => o.status === "paid")

  return (
    <div className="admin-dashboard">
      <div className="admin-welcome">
        <Avatar src={player.avatar?.url} alt={player.name} fallback={player.name} size="xl" />
        <div className="admin-welcome-text">
          <h1>Welcome back, {player.name}!</h1>
          <p>
            You are logged in as <strong>{user.email}</strong>
          </p>
          {player.position && <span className="admin-position-badge">{player.position}</span>}
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {isOrganizer && (
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <i className="bx bx-calendar" />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{myEvents.length}</div>
              <div className={styles.statLabel}>Events Organized</div>
              {upcomingEvents.length > 0 && (
                <div className={styles.statSubtext}>{upcomingEvents.length} upcoming</div>
              )}
            </div>
          </div>
        )}

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <i className="bx bx-map-pin" />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{pastAttendedEvents.length}</div>
            <div className={styles.statLabel}>Events Attended</div>
            {attendedEvents.length > pastAttendedEvents.length && (
              <div className={styles.statSubtext}>
                {attendedEvents.length - pastAttendedEvents.length} upcoming
              </div>
            )}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <i className="bx bx-purchase-tag" />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{paidOrders.length}</div>
            <div className={styles.statLabel}>Tickets Purchased</div>
            {orders.length > paidOrders.length && (
              <div className={styles.statSubtext}>{orders.length - paidOrders.length} pending</div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Your Upcoming Events</h2>
            <Link href="/admin/events" className={styles.viewAll}>
              View All →
            </Link>
          </div>
          <div className={styles.eventsList}>
            {upcomingEvents.slice(0, 3).map((event) => (
              <Link
                key={event.documentId}
                href={`/admin/events/${event.slug}`}
                className={styles.eventCard}
              >
                <div className={styles.eventDate}>{formatDate(event.start)}</div>
                <div className={styles.eventInfo}>
                  <h3>{event.name}</h3>
                  {event.location && (
                    <p className={styles.eventLocation}>
                      {event.location.name}, {event.location.country}
                    </p>
                  )}
                </div>
                <div className={styles.eventMeta}>
                  {event.isHost && <span className={styles.badge}>Host</span>}
                  {event.isMentor && <span className={styles.badge}>Mentor</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className={styles.section}>
        <h2>Quick Actions</h2>
        <div className="admin-cards">
          {isOrganizer && (
            <Link href="/admin/events/create" className="admin-card">
              <div className="admin-card-icon">
                <i className="bx bx-plus-circle" />
              </div>
              <div className="admin-card-content">
                <h3>Create Event</h3>
                <p>Organize a new #play14 event</p>
              </div>
            </Link>
          )}

          <Link href="/admin/profile" className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-edit" />
            </div>
            <div className="admin-card-content">
              <h3>Edit Profile</h3>
              <p>Update your player information</p>
            </div>
          </Link>

          <Link href="/admin/orders" className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-receipt" />
            </div>
            <div className="admin-card-content">
              <h3>Orders</h3>
              <p>View your ticket orders</p>
            </div>
          </Link>

          <Link href="/events" className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-calendar" />
            </div>
            <div className="admin-card-content">
              <h3>Browse Events</h3>
              <p>Discover upcoming #play14 events</p>
            </div>
          </Link>

          <Link href={`/players/${player.slug}`} className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-user" />
            </div>
            <div className="admin-card-content">
              <h3>View Profile</h3>
              <p>See your public player profile</p>
            </div>
          </Link>

          <Link href="/players" className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-group" />
            </div>
            <div className="admin-card-content">
              <h3>Community</h3>
              <p>Connect with other players</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
