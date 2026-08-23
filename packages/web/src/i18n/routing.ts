import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "fr", "es", "de", "it", "pt"],
  defaultLocale: "en",
  localePrefix: "as-needed",
})

export type Locale = (typeof routing.locales)[number]

export const localeLabels: Record<string, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
}

export const localeShortLabels: Record<string, string> = {
  en: "EN",
  fr: "FR",
  es: "ES",
  de: "DE",
  it: "IT",
  pt: "PT",
}

/**
 * OpenGraph `og:locale` values. Lives here with the other locale maps so it is
 * updated alongside them — it previously sat inline in the root layout and had
 * already drifted, leaving Portuguese pages advertising themselves as en_US.
 */
export const ogLocales: Record<string, string> = {
  en: "en_US",
  fr: "fr_FR",
  es: "es_ES",
  de: "de_DE",
  it: "it_IT",
  pt: "pt_PT",
}
