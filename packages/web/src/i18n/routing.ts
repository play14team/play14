import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "fr", "es", "de", "it"],
  defaultLocale: "en",
  localePrefix: "as-needed",
})

export type Locale = (typeof routing.locales)[number]
