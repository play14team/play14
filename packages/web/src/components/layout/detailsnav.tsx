import type { UploadFile } from "@/models/strapi"
import { format, parseISO } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import DefaultPlayerImage from "../ui/default-player-image"

export interface NavLink {
  slug: string
  name: string
  image?: UploadFile
  date?: Date | string
}

const DetailsNavigator = (props: {
  previous: NavLink | null
  next: NavLink | null
  entity: string
}) => {
  const { previous, next, entity } = props

  return (
    <nav className="event-profile-nav">
      {previous ? (
        <Link
          href={`/${entity}/${previous.slug}`}
          className="event-profile-nav__link event-profile-nav__link--prev"
        >
          <i className="bx bx-chevron-left event-profile-nav__icon" />
          {renderNavImage(previous.image, previous.name)}
          <div className="event-profile-nav__info">
            <span className="event-profile-nav__name">{previous.name}</span>
            {previous.date && (
              <span className="event-profile-nav__date">{formatDate(previous.date)}</span>
            )}
          </div>
        </Link>
      ) : (
        <div className="event-profile-nav__placeholder" />
      )}

      {next ? (
        <Link
          href={`/${entity}/${next.slug}`}
          className="event-profile-nav__link event-profile-nav__link--next"
        >
          <div className="event-profile-nav__info">
            <span className="event-profile-nav__name">{next.name}</span>
            {next.date && <span className="event-profile-nav__date">{formatDate(next.date)}</span>}
          </div>
          {renderNavImage(next.image, next.name)}
          <i className="bx bx-chevron-right event-profile-nav__icon" />
        </Link>
      ) : (
        <div className="event-profile-nav__placeholder" />
      )}
    </nav>
  )
}

function renderNavImage(image: UploadFile | undefined, name: string) {
  if (image) {
    return (
      <Image
        src={image.url}
        alt={image.name || name}
        width={40}
        height={40}
        className="event-profile-nav__image"
        unoptimized
      />
    )
  }

  return (
    <DefaultPlayerImage alt={name} width={40} height={40} className="event-profile-nav__image" />
  )
}

function formatDate(date: Date | string): string {
  const parsed = typeof date === "string" ? parseISO(date) : date
  return format(parsed, "MMM d, yyyy")
}

export default DetailsNavigator
