import Footer from "@/components/layout/footer"
import Loader from "@/components/layout/loader"
import Navbar from "@/components/layout/navbar"
import { WebVitals } from "@/components/utils/web-vitals"
import { getCurrentUser } from "@/libs/auth"
import Script from "next/script"
import { Suspense } from "react"

const displayWebVitals = process.env.NEXT_PUBLIC_WEB_VITALS === "true"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <>
      <Script src="https://widget.weezevent.com/weez.js" />
      <Navbar initialUser={user} />
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
    </>
  )
}
