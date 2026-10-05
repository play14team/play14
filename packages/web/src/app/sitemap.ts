import type { MetadataRoute } from "next"
import { getArticleSlugs } from "@/components/articles/get.action"
import { getEventSitemapEntries } from "@/components/events/get.action"
import { getGameSlugs } from "@/components/games/get.action"
import { routing } from "@/i18n/routing"
import { absoluteUrl, externalCanonical, localizedPath } from "@/libs/seo"

export const revalidate = 3600

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>

interface StaticRoute {
  path: string
  changeFrequency: ChangeFrequency
  priority: number
}

const STATIC_ROUTES: StaticRoute[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/events", changeFrequency: "daily", priority: 0.9 },
  { path: "/events/calendar", changeFrequency: "daily", priority: 0.8 },
  { path: "/events/map", changeFrequency: "daily", priority: 0.8 },
  { path: "/events/gallery", changeFrequency: "weekly", priority: 0.6 },
  { path: "/events/hosting", changeFrequency: "monthly", priority: 0.6 },
  { path: "/events/testimonials", changeFrequency: "monthly", priority: 0.5 },
  { path: "/games", changeFrequency: "weekly", priority: 0.9 },
  { path: "/articles", changeFrequency: "weekly", priority: 0.8 },
  { path: "/about/story", changeFrequency: "yearly", priority: 0.6 },
  { path: "/about/values", changeFrequency: "yearly", priority: 0.6 },
  { path: "/about/format", changeFrequency: "yearly", priority: 0.6 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms-of-sale", changeFrequency: "yearly", priority: 0.3 },
  { path: "/tools/debriefing-cube", changeFrequency: "monthly", priority: 0.5 },
  { path: "/likes", changeFrequency: "monthly", priority: 0.4 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const buildDate = new Date()

  // Same origin and form as the page's own canonical (always production, and
  // "/" resolves to "https://play14.org/"), so the two never disagree.
  const urlFor = (locale: string, pathname: string) => absoluteUrl(localizedPath(locale, pathname))

  const languagesFor = (pathname: string): Record<string, string> => {
    const languages: Record<string, string> = {}
    for (const locale of routing.locales) {
      languages[locale] = urlFor(locale, pathname)
    }
    languages["x-default"] = urlFor(routing.defaultLocale, pathname)
    return languages
  }

  // One <url> per locale: Google expects every localized page listed on its
  // own, each carrying the full hreflang set (itself included).
  const toEntries = (
    pathname: string,
    opts: {
      lastModified?: Date
      changeFrequency?: ChangeFrequency
      priority?: number
    } = {}
  ): MetadataRoute.Sitemap => {
    const languages = languagesFor(pathname)
    return routing.locales.map((locale) => ({
      url: urlFor(locale, pathname),
      lastModified: opts.lastModified ?? buildDate,
      changeFrequency: opts.changeFrequency,
      priority: opts.priority,
      alternates: { languages },
    }))
  }

  const [events, games, articles] = await Promise.all([
    getEventSitemapEntries().catch((error) => {
      console.error("sitemap: failed to fetch events", error)
      return []
    }),
    getGameSlugs().catch((error) => {
      console.error("sitemap: failed to fetch game slugs", error)
      return { games: [] as Array<{ slug: string; updatedAt?: string }> }
    }),
    getArticleSlugs().catch((error) => {
      console.error("sitemap: failed to fetch article slugs", error)
      return { articles: [] as Array<{ slug: string; updatedAt?: string; cannonical?: string }> }
    }),
  ])

  // Derived from the one events fetch rather than a scan per listing.
  const years = [
    ...new Set(
      events.filter((e) => e.start).map((e) => String(new Date(e.start as string).getFullYear()))
    ),
  ].sort((a, b) => Number(b) - Number(a))
  const countries = [
    ...new Set(events.map((e) => e.location?.country).filter((c): c is string => Boolean(c))),
  ].sort()

  return [
    ...STATIC_ROUTES.flatMap(({ path, changeFrequency, priority }) =>
      toEntries(path, { changeFrequency, priority })
    ),
    ...years.flatMap((year) =>
      toEntries(`/events/year/${year}`, { changeFrequency: "weekly", priority: 0.5 })
    ),
    ...countries
      .map((c) => c.toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c))
      .flatMap((code) =>
        toEntries(`/events/countries/${code}`, { changeFrequency: "weekly", priority: 0.5 })
      ),
    ...events.flatMap((e) =>
      toEntries(`/events/${e.slug}`, {
        lastModified: e.updatedAt ? new Date(e.updatedAt) : buildDate,
        changeFrequency: "weekly",
        priority: 0.7,
      })
    ),
    ...games.games.flatMap((g) =>
      toEntries(`/games/${g.slug}`, {
        lastModified: g.updatedAt ? new Date(g.updatedAt) : buildDate,
        changeFrequency: "monthly",
        priority: 0.7,
      })
    ),
    // Cross-posted articles name the original as canonical: listing them here
    // would ask Google to index a page that says it is a copy.
    ...articles.articles
      .filter((a) => !externalCanonical(a.cannonical))
      .flatMap((a) =>
        toEntries(`/articles/${a.slug}`, {
          lastModified: a.updatedAt ? new Date(a.updatedAt) : buildDate,
          changeFrequency: "monthly",
          priority: 0.6,
        })
      ),
  ]
}
