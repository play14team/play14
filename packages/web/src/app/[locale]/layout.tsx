import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { notFound } from "next/navigation"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"
import NextTopLoader from "nextjs-toploader"
import ScrollToTop from "@/components/utils/scroll-to-top"
import { ThemeProvider } from "@/components/utils/theme-provider"
import { routing } from "@/i18n/routing"
import "@/styles/main.scss"

const inter = Inter({ subsets: ["latin"] })

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
      locale:
        (
          { en: "en_US", fr: "fr_FR", es: "es_ES", de: "de_DE", it: "it_IT" } as Record<
            string,
            string
          >
        )[locale] || "en_US",
      type: "website",
    },
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, l === routing.defaultLocale ? "/" : `/${l}`])
      ),
    },
  }
}

// Avoid the dev-only performance.measure negative timestamp errors for some routes.
const shouldPatchPerformanceMeasure = process.env.NODE_ENV === "development"
const performanceMeasurePatch = [
  "(function () {",
  "  const perf = window.performance",
  '  if (!perf || typeof perf.measure !== "function") { return }',
  "  const originalMeasure = perf.measure",
  "  perf.measure = function () {",
  "    try { return originalMeasure.apply(this, arguments) }",
  "    catch (error) {",
  '      if (error && typeof error.message === "string" &&',
  '        error.message.includes("cannot have a negative time stamp")) { return }',
  "      throw error",
  "    }",
  "  }",
  "})()",
].join("\n")

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Boxicons from CDN for full icon set */}
        <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet" />
        {shouldPatchPerformanceMeasure && (
          <script
            // Static dev-only patch for performance.measure negative timestamp errors
            dangerouslySetInnerHTML={{ __html: performanceMeasurePatch }}
            key="performance-patch"
          />
        )}
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <NextTopLoader color="#FF5200" showSpinner={false} />
          <ScrollToTop />
          <NextIntlClientProvider locale={locale}>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
