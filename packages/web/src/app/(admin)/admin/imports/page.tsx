import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireOrganizer } from "@/libs/auth"

export const metadata: Metadata = {
  title: "Imports",
}

export default async function ImportsPage() {
  await requireOrganizer()
  redirect("/admin/players?tab=imports")
}
