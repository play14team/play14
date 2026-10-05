import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import EventDetails from "@/components/events/details/index"
import { getEventSlugs } from "@/components/events/get.action"
import { getEventBySlug } from "@/components/events/get.cached"
import Page from "@/components/layout/page"
import JsonLd from "@/components/seo/json-ld"
import { formatDate } from "@/libs/dates"
import { pageMetadata, SITE_NAME } from "@/libs/seo"
import type { SlugParamsProps } from "@/libs/slug-params"
import { breadcrumbJsonLd, eventJsonLd } from "@/libs/structured-data"

// Enable dynamic params for any new events not pre-generated at build time
export const dynamicParams = true

/**
 * Pre-generate static pages for all events at build time.
 * Pages are revalidated on-demand when updated in admin.
 */
export async function generateStaticParams() {
  const response = await getEventSlugs()
  return response.events.map((event) => ({
    slug: event.slug,
  }))
}

export async function generateMetadata(props: SlugParamsProps) {
  const t = await getTranslations("events")
  const { slug, locale } = await props.params
  const event = await getEventBySlug(slug, locale)

  // Handle case where event is not found
  if (!event) {
    return {
      title: t("eventNotFound"),
      description: t("eventNotFoundDescription"),
    }
  }

  let description = formatDate(event.start, event.end, event.timezone || "", true, locale)
  if (event.venue?.location) {
    description += ` | ${event.venue?.name} | ${event.venue?.location?.place_name}`
  }

  return pageMetadata({
    locale,
    pathname: `/events/${slug}`,
    title: event.name,
    description,
    images: [event.defaultImage?.url, ...(event.images ?? []).map((i) => i?.url)],
  })
}

export default async function Event(props: SlugParamsProps) {
  const { slug, locale } = await props.params
  const [event, t] = await Promise.all([
    getEventBySlug(slug, locale),
    getTranslations({ locale, namespace: "events" }),
  ])

  if (!event) {
    notFound()
  }

  return (
    <Page name={event.name} hideName={true}>
      <JsonLd
        data={[
          eventJsonLd(event, locale),
          breadcrumbJsonLd(locale, [
            { name: SITE_NAME, pathname: "/" },
            { name: t("title"), pathname: "/events" },
            { name: event.name },
          ]),
        ]}
      />
      <EventDetails event={event} />
    </Page>
  )
}
