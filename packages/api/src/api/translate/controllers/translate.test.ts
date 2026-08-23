import { readdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { LOCALE_NAMES } from "./translate"

const here = dirname(fileURLToPath(import.meta.url))
const MESSAGES_DIR = resolve(here, "../../../../../web/messages")

function webLocales(): string[] {
  return readdirSync(MESSAGES_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))
    .sort()
}

describe("LOCALE_NAMES", () => {
  // Reads the real message files rather than a copied list, so adding a locale
  // to the web app fails here instead of silently degrading translation.
  it("covers every locale the web app ships", () => {
    expect(Object.keys(LOCALE_NAMES).sort()).toEqual(webLocales())
  })

  it("maps each locale to a language name, never back to the bare code", () => {
    for (const [locale, name] of Object.entries(LOCALE_NAMES)) {
      expect(name).not.toBe(locale)
      expect(name.length).toBeGreaterThan(locale.length)
    }
  })

  it("names Italian explicitly", () => {
    // Regression guard: "it" was missing, so the prompt read "translate from
    // English to it" — indistinguishable from the English pronoun.
    expect(LOCALE_NAMES.it).toBe("Italian")
  })

  it("names Portuguese explicitly", () => {
    expect(LOCALE_NAMES.pt).toBe("Portuguese")
  })
})
