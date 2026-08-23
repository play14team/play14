import { describe, expect, it } from "vitest"
import { localeLabels, localeShortLabels, ogLocales, routing } from "./routing"

/**
 * Every locale map has to cover every configured locale. These drift silently:
 * a missing key falls back to English rather than throwing, so Portuguese pages
 * shipped `og:locale: en_US` for as long as `pt` was absent from that map.
 */
const MAPS = {
  localeLabels,
  localeShortLabels,
  ogLocales,
} as const

describe("locale maps", () => {
  for (const [name, map] of Object.entries(MAPS)) {
    it(`${name} covers exactly routing.locales`, () => {
      expect(Object.keys(map).sort()).toEqual([...routing.locales].sort())
    })

    it(`${name} has no empty values`, () => {
      for (const [locale, value] of Object.entries(map)) {
        expect(value, `${name}.${locale}`).toBeTruthy()
      }
    })
  }

  it("ships the six locales the message files provide", () => {
    expect([...routing.locales].sort()).toEqual(["de", "en", "es", "fr", "it", "pt"])
  })

  it("maps Italian and Portuguese to their own OpenGraph locales", () => {
    // Regression guard: both previously fell through to en_US.
    expect(ogLocales.it).toBe("it_IT")
    expect(ogLocales.pt).toBe("pt_PT")
  })
})
