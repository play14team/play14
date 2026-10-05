import type { MetadataRoute } from "next"
import { routing } from "@/i18n/routing"
import { SITE_URL as PRODUCTION_SITE_URL } from "@/libs/seo"

const localePrefixes = routing.locales.map((locale) =>
  locale === routing.defaultLocale ? "" : `/${locale}`
)

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_SITE_URL
  const isProduction = siteUrl === PRODUCTION_SITE_URL

  if (!isProduction) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    }
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api",
          // Private or per-user pages: nothing to rank, and they cost crawl budget.
          // /search is left crawlable on purpose: it carries a noindex meta tag,
          // which Google can only honour if it is allowed to fetch the page.
          // Spelled out per locale: a "/*/tickets" wildcard would also match
          // unrelated pages such as /articles/tickets-are-live.
          ...localePrefixes.flatMap((prefix) =>
            ["/admin", "/players", "/auth", "/orders", "/tickets", "/events/*/tickets"].map(
              (path) => `${prefix}${path}`
            )
          ),
        ],
      },
    ],
    sitemap: `${PRODUCTION_SITE_URL}/sitemap.xml`,
    host: PRODUCTION_SITE_URL,
  }
}
