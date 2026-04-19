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
        disallow: ["/admin", "/*/admin", "/api", "/players", "/*/players"],
      },
    ],
    sitemap: `${PRODUCTION_SITE_URL}/sitemap.xml`,
    host: PRODUCTION_SITE_URL,
  }
}
