import type { MetadataRoute } from "next"
import { getArticleSlugs } from "@/components/articles/get.action"
import { getEventSlugs } from "@/components/events/get.action"
import { getGameSlugs } from "@/components/games/get.action"
import { routing } from "@/i18n/routing"

export const revalidate = 3600

const DEFAULT_SITE_URL = "https://play14.org"

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
  { path: "/events/year", changeFrequency: "weekly", priority: 0.5 },
  { path: "/games", changeFrequency: "weekly", priority: 0.9 },
  { path: "/articles", changeFrequency: "weekly", priority: 0.8 },
  { path: "/about/story", changeFrequency: "yearly", priority: 0.6 },
  { path: "/about/values", changeFrequency: "yearly", priority: 0.6 },
  { path: "/about/format", changeFrequency: "yearly", priority: 0.6 },
  { path: "/connect", changeFrequency: "yearly", priority: 0.6 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms-of-sale", changeFrequency: "yearly", priority: 0.3 },
  { path: "/tools/debriefing-cube", changeFrequency: "monthly", priority: 0.5 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL
  const buildDate = new Date()

  const languagesFor = (pathname: string): Record<string, string> => {
    const languages: Record<string, string> = {}
    for (const locale of routing.locales) {
      const prefix = locale === routing.defaultLocale ? "" : `/${locale}`
      languages[locale] = `${siteUrl}${prefix}${pathname}`
    }
    return languages
  }

  const toEntry = (
    pathname: string,
    opts: {
      lastModified?: Date
      changeFrequency?: ChangeFrequency
      priority?: number
    } = {}
  ): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl}${pathname}`,
    lastModified: opts.lastModified ?? buildDate,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: { languages: languagesFor(pathname) },
  })

  const [events, games, articles] = await Promise.all([
    getEventSlugs().catch((error) => {
      console.error("sitemap: failed to fetch event slugs", error)
      return { events: [] as Array<{ slug: string; updatedAt?: string }> }
    }),
    getGameSlugs().catch((error) => {
      console.error("sitemap: failed to fetch game slugs", error)
      return { games: [] as Array<{ slug: string; updatedAt?: string }> }
    }),
    getArticleSlugs().catch((error) => {
      console.error("sitemap: failed to fetch article slugs", error)
      return { articles: [] as Array<{ slug: string; updatedAt?: string }> }
    }),
  ])

  return [
    ...STATIC_ROUTES.map(({ path, changeFrequency, priority }) =>
      toEntry(path, { changeFrequency, priority })
    ),
    ...events.events.map((e) =>
      toEntry(`/events/${e.slug}`, {
        lastModified: e.updatedAt ? new Date(e.updatedAt) : buildDate,
        changeFrequency: "weekly",
        priority: 0.7,
      })
    ),
    ...games.games.map((g) =>
      toEntry(`/games/${g.slug}`, {
        lastModified: g.updatedAt ? new Date(g.updatedAt) : buildDate,
        changeFrequency: "monthly",
        priority: 0.7,
      })
    ),
    ...articles.articles.map((a) =>
      toEntry(`/articles/${a.slug}`, {
        lastModified: a.updatedAt ? new Date(a.updatedAt) : buildDate,
        changeFrequency: "monthly",
        priority: 0.6,
      })
    ),
  ]
}
