import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin",
  robots: "noindex, nofollow",
}

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
