import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"
import NextTopLoader from "nextjs-toploader"
import ScrollToTop from "@/components/utils/scroll-to-top"
import { ogLocales, routing } from "@/i18n/routing"
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/libs/seo"

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "metadata" })

  return {
    title: {
      template: "#play14 - %s",
      default: t("title"),
    },
    description: t("description"),
    applicationName: SITE_NAME,
    creator: "Cédric Pontet",
    keywords: ["play", "learning", "innovation", "agile", "serious games", "unconference"],
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title: t("title"),
      description: t("description"),
      siteName: SITE_NAME,
      images: [DEFAULT_OG_IMAGE],
      locale: ogLocales[locale] || "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: "@play14team",
      title: t("title"),
      description: t("description"),
      images: [DEFAULT_OG_IMAGE.url],
    },
    // No `alternates` here on purpose: layout-level hreflang is inherited by
    // every page that does not set its own, which pointed each page's language
    // versions at the home page. Pages set canonical + hreflang via
    // `buildMetadata()` from `@/libs/seo`.
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  return (
    <>
      <NextTopLoader color="#FF5200" showSpinner={false} />
      <ScrollToTop />
      <NextIntlClientProvider locale={locale}>{children}</NextIntlClientProvider>
    </>
  )
}
