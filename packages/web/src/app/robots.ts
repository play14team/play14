import type { MetadataRoute } from "next"

const PRODUCTION_SITE_URL = "https://play14.org"

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
          ...["/admin", "/players", "/auth", "/orders", "/tickets", "/search"].flatMap((path) => [
            path,
            `/*${path}`,
          ]),
          "/events/*/tickets",
        ],
      },
    ],
    sitemap: `${PRODUCTION_SITE_URL}/sitemap.xml`,
    host: PRODUCTION_SITE_URL,
  }
}
