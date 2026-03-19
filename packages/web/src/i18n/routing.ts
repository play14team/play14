import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "fr", "es", "de", "it"],
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
}

export const localeShortLabels: Record<string, string> = {
  en: "EN",
  fr: "FR",
  es: "ES",
  de: "DE",
  it: "IT",
}
