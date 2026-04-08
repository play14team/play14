import { Inter } from "next/font/google"
import { getLocale } from "next-intl/server"
import { ThemeProvider } from "@/components/utils/theme-provider"
import "@/styles/main.scss"

const inter = Inter({ subsets: ["latin"] })

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Boxicons from CDN for full icon set */}
        <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
