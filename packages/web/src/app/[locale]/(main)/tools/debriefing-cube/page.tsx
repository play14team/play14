import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import DebriefingCube from "@/components/tools/debriefing-cube"
import { pageMetadata } from "@/libs/seo"
import type { LocaleParamsProps } from "@/libs/slug-params"

export async function generateMetadata({ params }: LocaleParamsProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "debriefingCube" })
  return pageMetadata({
    locale,
    pathname: "/tools/debriefing-cube",
    title: t("title"),
    description: t("metaDescription"),
  })
}

export default function DebriefingCubePage() {
  return <DebriefingCube />
}
