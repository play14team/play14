import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { requireOrganizer } from "@/libs/auth"

export async function generateMetadata() {
  const t = await getTranslations("adminMisc.imports")
  return {
    title: t("title"),
  }
}

export default async function ImportsPage() {
  await requireOrganizer()
  redirect("/admin/players?tab=imports")
}
