import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getLocale } from "next-intl/server"
import { AdminProviders } from "@/components/admin/admin-providers"
import AdminMobileHeader from "@/components/admin/mobile-header"
import AdminSidebar from "@/components/admin/sidebar"
import { routing } from "@/i18n/routing"
import { requireAuth } from "@/libs/auth"

export const metadata: Metadata = {
  title: "Admin",
  robots: "noindex, nofollow",
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // requireAuth redirects to login if not authenticated
  const session = await requireAuth("/admin")

  // Check if user has a player profile
  if (!session.user.player) {
    const locale = await getLocale()
    const prefix = locale === routing.defaultLocale ? "" : `/${locale}`
    redirect(`${prefix}/auth/no-player`)
  }

  return (
    <AdminProviders>
      <div className="admin-layout">
        <AdminSidebar user={session.user} />
        <div className="admin-main">
          <AdminMobileHeader />
          <main className="admin-content">{children}</main>
        </div>
      </div>
    </AdminProviders>
  )
}
