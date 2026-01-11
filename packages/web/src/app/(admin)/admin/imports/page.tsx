import type { Metadata } from "next"
import { requireOrganizer } from "@/libs/auth"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Imports",
}

export default async function ImportsPage() {
  await requireOrganizer()
  redirect("/admin/players?tab=imports")
}
