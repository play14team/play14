import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { ogLocales, routing } from "@/i18n/routing"

/**
 * Production origin. Canonical and hreflang URLs always point here, even from
 * staging, so a crawl of a non-production host never competes with play14.org
 * (robots.ts already blocks those hosts; this keeps the signals consistent).
 */
export const SITE_URL = "https://play14.org"
export const SITE_NAME = "#play14"

export const DEFAULT_OG_IMAGE = {
  url: "/og-default.png",
  width: 1200,
  height: 630,
  alt: "#play14 logo",
}

/** Prefix `pathname` with the locale segment, following `localePrefix: "as-needed"`. */
export function localizedPath(locale: string, pathname: string): string {
  const path = pathname === "/" ? "" : pathname
  if (locale === routing.defaultLocale) return path || "/"
  return `/${locale}${path}`
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`
}

/**
 * Per-page canonical + hreflang set. Every locale renders the same pathname,
 * and `x-default` points at the unprefixed (default-locale) URL.
 */
export function localeAlternates(
  locale: string,
  pathname: string,
  canonical?: string
): NonNullable<Metadata["alternates"]> {
  // A canonical pointing off-site says "this page is a copy": hreflang siblings
  // on play14.org would contradict it, so only the canonical is emitted.
  if (canonical) return { canonical }
  const languages: Record<string, string> = {}
  for (const l of routing.locales) {
    languages[l] = localizedPath(l, pathname)
  }
  languages["x-default"] = localizedPath(routing.defaultLocale, pathname)
  return {
    canonical: localizedPath(locale, pathname),
    languages,
  }
}

/** Plain-text excerpt of an HTML/markdown string, cut on a word boundary. */
export function toDescription(content: string | undefined | null, maxLength = 160) {
  if (!content) return undefined
  const text = content
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[#*_`>[\]]/g, "")
    .replace(/\s+/g, " ")
    .replace(/ ([.,;:!?])/g, "$1")
    .trim()
  if (!text) return undefined
  if (text.length <= maxLength) return text
  const cut = text.slice(0, maxLength - 1)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

interface PageMetadataInput {
  locale: string
  /** Locale-less pathname, e.g. `/events/foo`. */
  pathname: string
  title?: string
  description?: string
  /** Image URLs, first one wins as the primary share image. Falsy entries are dropped. */
  images?: Array<string | null | undefined>
  type?: "website" | "article"
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
  /** Override the canonical URL (e.g. an article first published elsewhere). */
  canonical?: string
  noindex?: boolean
}

/**
 * Build a page's metadata with canonical, hreflang, OpenGraph and Twitter card.
 *
 * Next.js merges metadata shallowly, so a page that sets `openGraph` or
 * `alternates` replaces the layout's value wholesale; going through this
 * helper keeps siteName/locale/fallback image on every page.
 */
export function buildMetadata(input: PageMetadataInput): Metadata {
  const url = input.canonical ?? localizedPath(input.locale, input.pathname)
  const imageUrls = (input.images ?? []).filter((i): i is string => Boolean(i))
  const images = imageUrls.length ? [...new Set(imageUrls)].slice(0, 4) : [DEFAULT_OG_IMAGE]

  const openGraphBase = {
    siteName: SITE_NAME,
    locale: ogLocales[input.locale] || "en_US",
    url,
    title: input.title,
    description: input.description,
    images,
  }

  return {
    title: input.title,
    description: input.description,
    alternates: localeAlternates(input.locale, input.pathname, input.canonical),
    openGraph:
      input.type === "article"
        ? {
            ...openGraphBase,
            type: "article",
            publishedTime: input.publishedTime,
            modifiedTime: input.modifiedTime,
            authors: input.authors?.length ? input.authors : undefined,
          }
        : { ...openGraphBase, type: "website" },
    twitter: {
      card: "summary_large_image",
      site: "@play14team",
      title: input.title,
      description: input.description,
      images: images.map((i) => (typeof i === "string" ? i : i.url)),
    },
    ...(input.noindex ? { robots: { index: false, follow: true } } : {}),
  }
}

/**
 * `buildMetadata` with the site-wide description as fallback, so pages that
 * have no copy of their own still ship `og:description` (the layout's value
 * is not inherited once a page sets `openGraph`).
 */
export async function pageMetadata(input: PageMetadataInput): Promise<Metadata> {
  if (input.description) return buildMetadata(input)
  const t = await getTranslations({ locale: input.locale, namespace: "metadata" })
  return buildMetadata({ ...input, description: t("description") })
}
