import Footer from "@/components/layout/footer"
import Loader from "@/components/layout/loader"
import Navbar from "@/components/layout/navbar"
import ScrollToTop from "@/components/layout/scroll-to-top"
import { WebVitals } from "@/components/utils/web-vitals"
import Script from "next/script"
import { Suspense } from "react"

const displayWebVitals = process.env.NEXT_PUBLIC_WEB_VITALS === "true"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Script src="https://widget.weezevent.com/weez.js" />
      <Navbar />
      <main>
        <div className="container">
          <div className="pt-100 pb-70">
            <Suspense fallback={<Loader />}>
              {displayWebVitals && <WebVitals />}
              {children}
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </>
  )
}
