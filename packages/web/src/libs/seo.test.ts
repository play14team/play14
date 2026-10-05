/**
 * Unit tests for page metadata helpers
 */

import { describe, expect, it, vi } from "vitest"

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => `metadata.${key}`),
}))

import { buildMetadata, localeAlternates, localizedPath, pageMetadata, toDescription } from "./seo"

describe("localizedPath", () => {
  it("leaves the default locale unprefixed", () => {
    expect(localizedPath("en", "/")).toBe("/")
    expect(localizedPath("en", "/events/foo")).toBe("/events/foo")
  })

  it("prefixes other locales", () => {
    expect(localizedPath("fr", "/")).toBe("/fr")
    expect(localizedPath("fr", "/events/foo")).toBe("/fr/events/foo")
  })
})

describe("localeAlternates", () => {
  it("points every locale at the same page plus x-default", () => {
    const alternates = localeAlternates("de", "/games/bar")
    expect(alternates.canonical).toBe("/de/games/bar")
    expect(alternates.languages).toEqual({
      en: "/games/bar",
      fr: "/fr/games/bar",
      es: "/es/games/bar",
      de: "/de/games/bar",
      it: "/it/games/bar",
      pt: "/pt/games/bar",
      "x-default": "/games/bar",
    })
  })

  it("drops hreflang when the canonical is off-site", () => {
    expect(localeAlternates("en", "/articles/x", "https://example.com/x")).toEqual({
      canonical: "https://example.com/x",
    })
  })
})

describe("toDescription", () => {
  it("strips HTML and collapses whitespace", () => {
    expect(toDescription("<p>Hello&nbsp;<strong>world</strong></p>\n\n<p>Again</p>")).toBe(
      "Hello world Again"
    )
  })

  it("cuts on a word boundary with an ellipsis", () => {
    const result = toDescription("one two three four five six", 15)
    expect(result).toBe("one two three…")
  })

  it("does not double-unescape entities", () => {
    expect(toDescription("Tom &amp; Jerry use &amp;lt;b&amp;gt;")).toBe("Tom & Jerry use &lt;b&gt;")
  })

  it("returns undefined for empty content", () => {
    expect(toDescription(undefined)).toBeUndefined()
    expect(toDescription("<p> </p>")).toBeUndefined()
  })
})

describe("buildMetadata", () => {
  it("falls back to the default share image", () => {
    const metadata = buildMetadata({ locale: "en", pathname: "/events" })
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({ url: "/og-default.png" }),
    ])
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" })
  })

  it("dedupes images and drops empty entries", () => {
    const metadata = buildMetadata({
      locale: "fr",
      pathname: "/games/x",
      images: ["https://cdn/a.jpg", undefined, "https://cdn/a.jpg", "https://cdn/b.jpg"],
    })
    expect(metadata.openGraph?.images).toEqual(["https://cdn/a.jpg", "https://cdn/b.jpg"])
    expect(metadata.openGraph).toMatchObject({ url: "/fr/games/x", locale: "fr_FR" })
  })

  it("sets robots noindex on request", () => {
    expect(buildMetadata({ locale: "en", pathname: "/search", noindex: true }).robots).toEqual({
      index: false,
      follow: true,
    })
  })
})

describe("pageMetadata", () => {
  it("falls back to the site description", async () => {
    const metadata = await pageMetadata({ locale: "en", pathname: "/events" })
    expect(metadata.description).toBe("metadata.description")
    expect(metadata.openGraph?.description).toBe("metadata.description")
  })
})
