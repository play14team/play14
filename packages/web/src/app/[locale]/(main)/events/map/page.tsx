import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { getEventMarkers } from "@/components/events/get.action"
import EventMap from "@/components/events/map"
import Page from "@/components/layout/page"
import { pageMetadata } from "@/libs/seo"
import type { LocaleParamsProps } from "@/libs/slug-params"
import type { Event } from "@/models/strapi"

export async function generateMetadata({ params }: LocaleParamsProps): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata({ locale, pathname: "/events/map", title: "Events | Map" })
}

export default async function EventMapPage() {
  const t = await getTranslations("events")
  const events = (await getEventMarkers()) as Event[]

  return (
    <Page name={t("mapTitle")}>
      <div className="pt-5 pb-100">
        <EventMap events={events} />
      </div>
    </Page>
  )
}
