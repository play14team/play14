import type { Article, Event, Game, GeoLocation } from "@/models/strapi"
import {
  absoluteUrl,
  externalCanonical,
  localizedPath,
  SITE_NAME,
  SITE_URL,
  toDescription,
} from "./seo"

/**
 * schema.org JSON-LD builders. Pure functions so they can be unit-tested and
 * checked against Google's Rich Results Test without rendering a page.
 */

type JsonLdObject = Record<string, unknown>

const ORGANIZATION_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`

// Carries name + url so pages without the full Organization node still validate.
const organizationRef = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  url: SITE_URL,
}

export function organizationJsonLd(description: string): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    legalName: "#play14 a.s.b.l.",
    url: SITE_URL,
    logo: absoluteUrl("/logo/play14_500x500_white_bg.png"),
    description,
    foundingDate: "2014",
    foundingLocation: { "@type": "Place", name: "Luxembourg" },
    address: { "@type": "PostalAddress", addressCountry: "LU" },
    sameAs: [
      "https://www.linkedin.com/groups/7478250",
      "https://twitter.com/play14team",
      "https://www.youtube.com/channel/UCk_bP4BFqSSA4dqUz9cRK8A",
      "https://www.facebook.com/Play14-making-the-world-more-fun-than-fun-315955075134911/",
    ],
  }
}

export function websiteJsonLd(locale: string, description: string): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description,
    inLanguage: locale,
    publisher: organizationRef,
  }
}

export interface BreadcrumbItem {
  name: string
  /** Locale-less pathname; omit on the last (current) item. */
  pathname?: string
}

export function breadcrumbJsonLd(locale: string, items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.pathname ? { item: absoluteUrl(localizedPath(locale, item.pathname)) } : {}),
    })),
  }
}

function imageUrls(...images: Array<{ url?: string } | null | undefined>): string[] | undefined {
  const urls = images.map((i) => i?.url).filter((u): u is string => Boolean(u))
  return urls.length ? [...new Set(urls)].slice(0, 5).map(absoluteUrl) : undefined
}

function geoCoordinates(location: GeoLocation | undefined): JsonLdObject | undefined {
  if (!location) return undefined
  if ("geometry" in location && location.geometry?.coordinates) {
    const [longitude, latitude] = location.geometry.coordinates
    return { "@type": "GeoCoordinates", latitude, longitude }
  }
  if ("lat" in location && location.lat != null && location.lng != null) {
    return { "@type": "GeoCoordinates", latitude: location.lat, longitude: location.lng }
  }
  return undefined
}

const EVENT_STATUS: Record<string, string> = {
  Cancelled: "https://schema.org/EventCancelled",
}

/**
 * Google's Event rich result needs name, startDate and a location with an
 * address. Offers carry no price: ticket types live behind the purchase flow
 * and a wrong price is worse than none (Google only warns on a missing one).
 */
export function eventJsonLd(event: Event, locale: string): JsonLdObject {
  const url = absoluteUrl(localizedPath(locale, `/events/${event.slug}`))
  const venue = event.venue
  const city = event.location
  const address = {
    "@type": "PostalAddress",
    streetAddress: venue?.location?.place_name,
    addressLocality: city?.name,
    addressCountry: city?.country,
  }

  const hasTickets =
    event.ticketingMode === "internal" ||
    (event.ticketingMode === "external" && Boolean(event.registration?.link))
  const offers =
    hasTickets && event.eventStatus !== "Cancelled" && event.eventStatus !== "Over"
      ? {
          "@type": "Offer",
          url: event.ticketingMode === "internal" ? url : event.registration?.link,
          availability: "https://schema.org/InStock",
        }
      : undefined

  const organizers = (event.hosts ?? [])
    .filter((h) => h?.name)
    .map((h) => ({ "@type": "Person", name: h.name }))

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    url,
    startDate: event.start,
    endDate: event.end,
    eventStatus: EVENT_STATUS[event.eventStatus] ?? "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    description: toDescription(event.description, 300),
    image: imageUrls(event.defaultImage, ...(event.images ?? [])),
    location: {
      "@type": "Place",
      name: venue?.name ?? city?.name ?? event.name,
      address,
      geo: geoCoordinates(venue?.location ?? city?.location),
      ...(venue?.website ? { url: venue.website } : {}),
    },
    organizer: [organizationRef, ...organizers],
    ...(offers ? { offers } : {}),
    ...(event.sponsorships?.length
      ? {
          sponsor: event.sponsorships
            .flatMap((s) => s.sponsors ?? [])
            .filter((s) => s?.name)
            .map((s) => ({ "@type": "Organization", name: s.name, url: s.url })),
        }
      : {}),
  }
}

export function articleJsonLd(article: Article, locale: string): JsonLdObject {
  const url = absoluteUrl(localizedPath(locale, `/articles/${article.slug}`))
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: toDescription(article.summary || article.content, 300),
    image: imageUrls(article.defaultImage, ...(article.images ?? [])),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: article.author?.name
      ? { "@type": "Person", name: article.author.name }
      : organizationRef,
    publisher: organizationRef,
    mainEntityOfPage: externalCanonical(article.cannonical) ?? url,
    keywords: article.tags?.map((t) => t.value).join(", ") || undefined,
  }
}

export function gameJsonLd(game: Game, locale: string): JsonLdObject {
  const url = absoluteUrl(localizedPath(locale, `/games/${game.slug}`))
  const authorNames = [...(game.proposedBy ?? []), ...(game.documentedBy ?? [])]
    .map((p) => p?.name)
    .filter((name): name is string => Boolean(name))
  const authors = [...new Set(authorNames)].map((name) => ({ "@type": "Person", name }))
  return {
    "@context": "https://schema.org",
    "@type": "Game",
    name: game.name,
    url,
    description: toDescription(game.summary || game.description, 300),
    image: imageUrls(game.defaultImage, ...(game.images ?? [])),
    genre: game.category,
    keywords: game.tags?.map((t) => t.value).join(", ") || undefined,
    datePublished: game.publishedAt,
    ...(authors.length ? { author: authors } : {}),
    publisher: organizationRef,
  }
}
