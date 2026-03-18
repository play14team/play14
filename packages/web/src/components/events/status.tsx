import { useTranslations } from "next-intl"
import type { Enum_Event_Eventstatus } from "@/models/strapi"

const icons: Record<string, string> = {
  Announced: "calendar-plus",
  Open: "calendar-edit",
  Over: "calendar-check",
  Cancelled: "calendar-x",
}

const EventStatus = (props: { status: Enum_Event_Eventstatus | string }) => {
  const t = useTranslations("events")
  const { status } = props
  const icon = icons[status] || "calendar"
  const key = `status.${status.toLowerCase()}` as Parameters<typeof t>[0]

  return (
    <>
      <i className={`bx bx-${icon}`} aria-hidden="true" /> {t(key)}
    </>
  )
}

export default EventStatus
