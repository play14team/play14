import EventDetails from "@/components/events/details"
import { getEventSlugs } from "@/components/events/get.action"
import { getEventBySlug } from "@/components/events/get.cached"
import Page from "@/components/layout/page"
import { formatDate } from "@/libs/dates"
import type { SlugParamsProps } from "@/libs/slug-params"
import { notFound } from "next/navigation"

// Fallback revalidation every hour (on-demand revalidation handles admin updates immediately)
export const revalidate = 3600

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
  const { slug } = await props.params
  const event = await getEventBySlug(slug)

  // Handle case where event is not found
  if (!event) {
    return {
      title: "Event Not Found",
      description: "The requested event could not be found.",
    }
  }

  const images = event.images?.filter(Boolean)?.map((i) => (i as { url: string }).url) as string[]
  let description = formatDate(event.start, event.end, event.timezone || "", true)
  if (event.venue?.location) {
    description += ` | ${event.venue?.name} | ${event.venue?.location?.place_name}`
  }

  return {
    title: `Events | ${event.name}`,
    description: description,
    openGraph: {
      title: event.name,
      description: description,
      type: "article",
      publishedTime: event.publishedAt,
      authors: event.hosts?.filter(Boolean)?.map((h) => (h as { name: string }).name),
      images: [event.defaultImage?.url].concat(images),
    },
  }
}

export default async function Event(props: SlugParamsProps) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)

  if (!event) {
    notFound()
  }

  return (
    <Page name={event.name} hideName={true}>
      <EventDetails event={event} />
    </Page>
  )
}
