import { format, parseISO } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import { useLocale } from "next-intl"
import { getDateFnsLocale } from "@/libs/dates"
import type { UploadFile } from "@/models/strapi"
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
  const locale = useLocale()

  // Use entity-specific class names for styling
  const baseClass = entity === "articles" ? "article-profile-nav" : "event-profile-nav"

  return (
    <nav className={baseClass}>
      {previous ? (
        <Link
          href={`/${entity}/${previous.slug}`}
          className={`${baseClass}__link ${baseClass}__link--prev`}
        >
          <i className={`bx bx-chevron-left ${baseClass}__icon`} />
          {renderNavImage(previous.image, previous.name, baseClass)}
          <div className={`${baseClass}__info`}>
            <span className={`${baseClass}__title`}>{previous.name}</span>
            {previous.date && (
              <span className={`${baseClass}__date`}>{formatDate(previous.date, locale)}</span>
            )}
          </div>
        </Link>
      ) : (
        <div className={`${baseClass}__placeholder`} />
      )}

      {next ? (
        <Link
          href={`/${entity}/${next.slug}`}
          className={`${baseClass}__link ${baseClass}__link--next`}
        >
          <div className={`${baseClass}__info`}>
            <span className={`${baseClass}__title`}>{next.name}</span>
            {next.date && (
              <span className={`${baseClass}__date`}>{formatDate(next.date, locale)}</span>
            )}
          </div>
          {renderNavImage(next.image, next.name, baseClass)}
          <i className={`bx bx-chevron-right ${baseClass}__icon`} />
        </Link>
      ) : (
        <div className={`${baseClass}__placeholder`} />
      )}
    </nav>
  )
}

function renderNavImage(image: UploadFile | undefined, name: string, baseClass: string) {
  if (image) {
    return (
      <Image
        src={image.url}
        alt={image.name || name}
        width={40}
        height={40}
        className={`${baseClass}__image`}
        unoptimized
      />
    )
  }

  return <DefaultPlayerImage alt={name} width={40} height={40} className={`${baseClass}__image`} />
}

function formatDate(date: Date | string, locale?: string): string {
  const parsed = typeof date === "string" ? parseISO(date) : date
  return format(parsed, "MMM d, yyyy", { locale: getDateFnsLocale(locale) })
}

export default DetailsNavigator
