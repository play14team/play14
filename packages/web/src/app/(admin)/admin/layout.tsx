import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AdminProviders } from "@/components/admin/admin-providers"
import AdminSidebar from "@/components/admin/sidebar"
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
    redirect("/auth/no-player")
  }

  return (
    <AdminProviders>
      <div className="admin-layout">
        <AdminSidebar user={session.user} />
        <div className="admin-main">
          <main className="admin-content">{children}</main>
        </div>
      </div>
    </AdminProviders>
  )
}
