import ScrollToTop from "@/components/utils/scroll-to-top"
import { ThemeProvider } from "@/components/utils/theme-provider"
import "@/styles/main.scss"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import NextTopLoader from "nextjs-toploader"

const inter = Inter({ subsets: ["latin"] })
const title = "#play14 - play is the way"
const description =
  "#play14 is a worldwide gathering of like-minded people who believe that playing is the best way to learn, share and be creative!"

export const metadata: Metadata = {
  title: {
    template: "#play14 - %s",
    default: title,
  },
  description: description,
  creator: "Cédric Pontet",
  keywords: ["play", "learning", "innovation"],
  metadataBase: new URL("https://play14.org"),
  openGraph: {
    title: title,
    description: description,
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
    locale: "en_US",
    type: "website",
  },
}

// Avoid the dev-only performance.measure negative timestamp errors for some routes.
const shouldPatchPerformanceMeasure = process.env.NODE_ENV === "development"
const performanceMeasurePatch = `
  (function () {
    const perf = window.performance
    if (!perf || typeof perf.measure !== "function") {
      return
    }

    const originalMeasure = perf.measure
    perf.measure = function () {
      try {
        return originalMeasure.apply(this, arguments)
      } catch (error) {
        if (
          error &&
          typeof error.message === "string" &&
          error.message.includes("cannot have a negative time stamp")
        ) {
          return
        }
        throw error
      }
    }
  })()
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {shouldPatchPerformanceMeasure && (
          <script
            dangerouslySetInnerHTML={{ __html: performanceMeasurePatch }}
            key="performance-patch"
          />
        )}
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <NextTopLoader color="#FF5200" showSpinner={false} />
          <ScrollToTop />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
