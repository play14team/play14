import { getLocale, getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { getStatistics, type Play14Statistics } from "./get.action"

interface StatItem {
  value: number
  label: string
  icon: string
  color: string
  href?: string
  suffix?: string
}

function formatNumber(num: number, locale: string): string {
  return num.toLocaleString(locale)
}

function StatCard({ item, locale }: { item: StatItem; locale: string }) {
  const content = (
    <div className="single-funfacts-box">
      <div className="icon">
        <i className={`${item.icon} ${item.color}`} aria-hidden="true" />
      </div>
      <h3>
        {formatNumber(item.value, locale)}
        {item.suffix ?? "+"}
      </h3>
      <p>{item.label}</p>
    </div>
  )

  if (item.href) {
    return <Link href={item.href}>{content}</Link>
  }

  return content
}

export default async function Statistics() {
  const t = await getTranslations("home")
  const locale = await getLocale()
  const stats: Play14Statistics = await getStatistics()

  const statItems: StatItem[] = [
    {
      value: stats.yearsSince2014,
      label: t("statistics.yearsOfPlay"),
      icon: "bx bx-calendar-heart",
      color: "orange",
      suffix: "",
    },
    {
      value: stats.countries,
      label: t("statistics.countries"),
      icon: "bx bx-globe",
      color: "blue",
      href: "/events",
    },
    {
      value: stats.events,
      label: t("statistics.eventsOrganized"),
      icon: "bx bx-calendar-event",
      color: "green",
      href: "/events",
    },
    {
      value: stats.players,
      label: t("statistics.players"),
      icon: "bx bx-group",
      color: "orange",
      href: "/players",
    },
    {
      value: stats.hosts,
      label: t("statistics.hosts"),
      icon: "bx bx-star",
      color: "green",
      href: "/players",
    },
    {
      value: stats.games,
      label: t("statistics.gamesAndActivities"),
      icon: "bx bx-game",
      color: "blue",
      href: "/games",
    },
  ]

  // Only show stats if we have data
  if (stats.events === 0 && stats.players === 0) {
    return null
  }

  return (
    <section className="funfacts-area pt-100 pb-70">
      <div className="container">
        <div className="section-title">
          <h2>
            {t.rich("statistics.title", {
              span: (chunks) => <span>{chunks}</span>,
            })}
          </h2>
          <p>{t("statistics.subtitle")}</p>
        </div>
        <div className="row justify-content-center">
          {statItems.map((item) => (
            <div key={item.label} className="col-lg-4 col-md-6 col-sm-6">
              <StatCard item={item} locale={locale} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
