import Link from "next/link"
import { getStatistics, Play14Statistics } from "./get.action"

interface StatItem {
  value: number
  label: string
  icon: string
  color: string
  href?: string
  suffix?: string
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function StatCard({ item }: { item: StatItem }) {
  const content = (
    <div className="single-funfacts-box">
      <div className="icon">
        <i className={`${item.icon} ${item.color}`}></i>
      </div>
      <h3>
        {formatNumber(item.value)}
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
  const stats: Play14Statistics = await getStatistics()

  const statItems: StatItem[] = [
    {
      value: stats.yearsSince2014,
      label: "Years of Play",
      icon: "bx bx-calendar-heart",
      color: "orange",
      suffix: "",
    },
    {
      value: stats.countries,
      label: "Countries",
      icon: "bx bx-globe",
      color: "blue",
      href: "/events",
    },
    {
      value: stats.events,
      label: "Events Organized",
      icon: "bx bx-calendar-event",
      color: "green",
      href: "/events",
    },
    {
      value: stats.players,
      label: "Players",
      icon: "bx bx-group",
      color: "orange",
      href: "/players",
    },
    {
      value: stats.hosts,
      label: "Hosts",
      icon: "bx bx-star",
      color: "green",
      href: "/players",
    },
    {
      value: stats.games,
      label: "Games & Activities",
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
            Our global <span>impact</span>
          </h2>
          <p>
            Since 2014, #play14 has grown into a worldwide movement connecting
            people through the power of play.
          </p>
        </div>
        <div className="row justify-content-center">
          {statItems.map((item) => (
            <div key={item.label} className="col-lg-4 col-md-6 col-sm-6">
              <StatCard item={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
