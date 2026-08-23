import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"
import NextTopLoader from "nextjs-toploader"
import ScrollToTop from "@/components/utils/scroll-to-top"
import { ogLocales, routing } from "@/i18n/routing"

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
    creator: "Cédric Pontet",
    keywords: ["play", "learning", "innovation"],
    metadataBase: new URL("https://play14.org"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: "https://play14.org",
      siteName: "#play14",
      images: [
        {
          url: "https://play14.org/_next/static/media/play14_white_bg_transparent.1b2c7257.svg",
          alt: "play14 svg logo",
        },
        {
          url: "https://play14.org/_next/static/media/play14_1500x500_transparent.c4d92af9.png",
          width: 1500,
          height: 500,
          alt: "play14 logo transparent background",
        },
      ],
      locale: ogLocales[locale] || "en_US",
      type: "website",
    },
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, l === routing.defaultLocale ? "/" : `/${l}`])
      ),
    },
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
