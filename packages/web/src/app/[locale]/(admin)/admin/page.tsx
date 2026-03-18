import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { getMyOrders } from "@/components/tickets/purchase.action"
import Avatar from "@/components/ui/avatar"
import { Link } from "@/i18n/navigation"
import { requirePlayer } from "@/libs/auth"
import { getMyAttendedEvents, getMyEvents } from "./events/events.action"
import styles from "./page.module.scss"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin")
  return { title: t("dashboard.title") }
}

export default async function AdminDashboardPage() {
  const { user, player } = await requirePlayer("/admin")
  const t = await getTranslations("admin")
  const locale = await getLocale()

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

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-welcome">
        <Avatar src={player.avatar?.url} alt={player.name} fallback={player.name} size="xl" />
        <div className="admin-welcome-text">
          <h1>{t("dashboard.welcome", { name: player.name })}</h1>
          <p>
            {t.rich("dashboard.loggedInAs", {
              strong: (chunks) => <strong>{chunks}</strong>,
              email: user.email,
            })}
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
              <div className={styles.statLabel}>{t("dashboard.eventsOrganized")}</div>
              {upcomingEvents.length > 0 && (
                <div className={styles.statSubtext}>
                  {t("dashboard.upcoming", { count: upcomingEvents.length })}
                </div>
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
            <div className={styles.statLabel}>{t("dashboard.eventsAttended")}</div>
            {attendedEvents.length > pastAttendedEvents.length && (
              <div className={styles.statSubtext}>
                {t("dashboard.upcoming", {
                  count: attendedEvents.length - pastAttendedEvents.length,
                })}
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
            <div className={styles.statLabel}>{t("dashboard.ticketsPurchased")}</div>
            {orders.length > paidOrders.length && (
              <div className={styles.statSubtext}>
                {t("dashboard.pending", { count: orders.length - paidOrders.length })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{t("dashboard.yourUpcomingEvents")}</h2>
            <Link href="/admin/events" className={styles.viewAll}>
              {t("dashboard.viewAll")}
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
                  {event.isHost && <span className={styles.badge}>{t("dashboard.badgeHost")}</span>}
                  {event.isMentor && (
                    <span className={styles.badge}>{t("dashboard.badgeMentor")}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className={styles.section}>
        <h2>{t("dashboard.quickActions")}</h2>
        <div className="admin-cards">
          {isOrganizer && (
            <Link href="/admin/events/create" className="admin-card">
              <div className="admin-card-icon">
                <i className="bx bx-plus-circle" />
              </div>
              <div className="admin-card-content">
                <h3>{t("dashboard.createEvent")}</h3>
                <p>{t("dashboard.createEventDescription")}</p>
              </div>
            </Link>
          )}

          <Link href="/admin/profile" className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-edit" />
            </div>
            <div className="admin-card-content">
              <h3>{t("dashboard.editProfile")}</h3>
              <p>{t("dashboard.editProfileDescription")}</p>
            </div>
          </Link>

          <Link href="/admin/orders" className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-receipt" />
            </div>
            <div className="admin-card-content">
              <h3>{t("dashboard.orders")}</h3>
              <p>{t("dashboard.ordersDescription")}</p>
            </div>
          </Link>

          <Link href="/events" className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-calendar" />
            </div>
            <div className="admin-card-content">
              <h3>{t("dashboard.browseEvents")}</h3>
              <p>{t("dashboard.browseEventsDescription")}</p>
            </div>
          </Link>

          <Link href={`/players/${player.slug}`} className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-user" />
            </div>
            <div className="admin-card-content">
              <h3>{t("dashboard.viewProfile")}</h3>
              <p>{t("dashboard.viewProfileDescription")}</p>
            </div>
          </Link>

          <Link href="/players" className="admin-card">
            <div className="admin-card-icon">
              <i className="bx bx-group" />
            </div>
            <div className="admin-card-content">
              <h3>{t("dashboard.community")}</h3>
              <p>{t("dashboard.communityDescription")}</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
