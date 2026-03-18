import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import Page from "@/components/layout/page"
import { getLegalMDXComponents } from "@/components/legal/mdx-components"
import type { Locale } from "@/i18n/routing"
import { loadMDX } from "@/libs/mdx"

interface PrivacyPageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "privacy" })
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function PrivacyPolicy({ params }: PrivacyPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "privacy" })
  const components = getLegalMDXComponents()
  const { content } = await loadMDX(`privacy/${locale}.mdx`, components)

  return (
    <Page name={t("title")}>
      <div className="centered">
        <p>{t("lastUpdate")}</p>
      </div>
      <div className="container pb-100">{content}</div>
    </Page>
  )
}
