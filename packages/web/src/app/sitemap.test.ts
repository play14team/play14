/**
 * Unit tests for the sitemap
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/events/get.action", () => ({
  getEventSitemapEntries: vi.fn(async () => [
    {
      slug: "lux-2025",
      updatedAt: "2025-04-01T00:00:00.000Z",
      start: "2025-03-14T17:00:00.000Z",
      location: { country: "lu" },
    },
    { slug: "paris-2024", start: "2024-06-01T17:00:00.000Z", location: { country: "FR" } },
    { slug: "new-year", start: "2023-01-01T00:30:00.000Z" },
    { slug: "online", start: "2024-11-01T17:00:00.000Z", location: { country: "Online" } },
  ]),
}))
vi.mock("@/components/games/get.action", () => ({
  getGameSlugs: vi.fn(async () => ({ games: [{ slug: "marshmallow" }] })),
}))
vi.mock("@/components/articles/get.action", () => ({
  getArticleSlugs: vi.fn(async () => ({
    articles: [{ slug: "ours" }, { slug: "cross-posted", cannonical: "https://blog.example/post" }],
  })),
}))

import { getEventSitemapEntries } from "@/components/events/get.action"
import sitemap from "./sitemap"

const urls = (entries: Awaited<ReturnType<typeof sitemap>>) => entries.map((e) => e.url)

describe("sitemap", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it("lists the home page exactly as its canonical, one entry per locale", async () => {
    const entries = await sitemap()
    const home = entries.filter((e) => e.priority === 1)
    expect(home.map((e) => e.url)).toEqual([
      "https://play14.org/",
      "https://play14.org/fr",
      "https://play14.org/es",
      "https://play14.org/de",
      "https://play14.org/it",
      "https://play14.org/pt",
    ])
    expect(home[0].alternates?.languages).toMatchObject({
      fr: "https://play14.org/fr",
      "x-default": "https://play14.org/",
    })
  })

  it("always uses the production origin, like the canonicals", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.play14.org")
    expect(urls(await sitemap()).every((u) => u.startsWith("https://play14.org/"))).toBe(true)
  })

  it("derives year and country pages from a single events fetch", async () => {
    vi.mocked(getEventSitemapEntries).mockClear()
    const all = urls(await sitemap())
    expect(getEventSitemapEntries).toHaveBeenCalledTimes(1)
    expect(all).toEqual(
      expect.arrayContaining([
        "https://play14.org/events/year/2025",
        "https://play14.org/events/year/2024",
        "https://play14.org/events/countries/LU",
        "https://play14.org/fr/events/countries/FR",
        "https://play14.org/events/lux-2025",
      ])
    )
    expect(all.some((u) => u.includes("/countries/ONLINE"))).toBe(false)
  })

  it("groups years in UTC, whatever the server timezone", async () => {
    vi.stubEnv("TZ", "America/New_York")
    const all = urls(await sitemap())
    expect(all).toContain("https://play14.org/events/year/2023")
    expect(all).not.toContain("https://play14.org/events/year/2022")
  })

  it("leaves out articles whose canonical lives elsewhere", async () => {
    const all = urls(await sitemap())
    expect(all).toContain("https://play14.org/articles/ours")
    expect(all.some((u) => u.includes("cross-posted"))).toBe(false)
  })
})
