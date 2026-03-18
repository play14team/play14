import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import DebriefingCube from "@/components/tools/debriefing-cube"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("debriefingCube")
  return {
    title: t("title"),
    description: t("metaDescription"),
  }
}

export default function DebriefingCubePage() {
  return <DebriefingCube />
}
