/**
 * Unit tests for robots.txt rules
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import robots from "./robots"

afterEach(() => {
  vi.unstubAllEnvs()
})

function disallowList() {
  const rules = robots().rules
  const rule = Array.isArray(rules) ? rules[0] : rules
  return [rule.disallow].flat().filter((path): path is string => Boolean(path))
}

describe("robots", () => {
  it("blocks everything outside production", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.play14.org")
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } })
  })

  it("blocks private pages in every locale and points at the sitemap", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://play14.org")
    const disallow = disallowList()
    expect(disallow).toEqual(
      expect.arrayContaining([
        "/api",
        "/tickets",
        "/fr/tickets",
        "/pt/orders",
        "/events/*/tickets",
        "/de/events/*/tickets",
      ])
    )
    expect(robots().sitemap).toBe("https://play14.org/sitemap.xml")
  })

  it("leaves /search crawlable so its noindex is seen", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://play14.org")
    expect(disallowList().some((path) => path.includes("search"))).toBe(false)
  })

  it("does not use a leading wildcard that would match unrelated pages", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://play14.org")
    expect(disallowList().some((path) => path.startsWith("/*"))).toBe(false)
  })
})
