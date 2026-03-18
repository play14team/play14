import { getTranslations } from "next-intl/server"
import type { ComponentEventsSponsorship, Sponsor } from "@/models/strapi"
import EventSponsor from "./sponsor"

interface GroupedSponsorship {
  category: string
  sponsors: Sponsor[]
}

const EventSponsorships = async (props: { sponsorships: Array<ComponentEventsSponsorship> }) => {
  const t = await getTranslations("events")
  const { sponsorships } = props

  // Group sponsors by category name
  const groupedByCategory = sponsorships?.reduce<Record<string, GroupedSponsorship>>(
    (acc, item) => {
      if (!item?.sponsors || item.sponsors.length === 0) return acc

      const category = item.category || "Sponsors"
      if (!acc[category]) {
        acc[category] = { category, sponsors: [] }
      }
      acc[category].sponsors.push(...item.sponsors.filter((s): s is Sponsor => s !== undefined))
      return acc
    },
    {}
  )

  const categoryGroups = Object.values(groupedByCategory || {})

  if (categoryGroups.length === 0) {
    return null
  }

  return (
    <div className="container">
      <div className="section-title">
        <span className="sub-title">{t("sponsors")}</span>
      </div>
      {categoryGroups.map((group) => (
        <div key={group.category} className="sponsor-category-section">
          <h4 className="sponsor-category-title">{group.category}</h4>
          <div className="row">
            {group.sponsors.map((sponsor, index) => (
              <EventSponsor key={`${group.category}-${sponsor.name}-${index}`} sponsor={sponsor} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default EventSponsorships
