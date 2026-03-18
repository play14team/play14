import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import Page from "@/components/layout/page"
import { getLegalMDXComponents } from "@/components/legal/mdx-components"
import type { Locale } from "@/i18n/routing"
import { loadMDX } from "@/libs/mdx"

interface TermsOfSalePageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: TermsOfSalePageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "termsOfSale" })
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function TermsOfSale({ params }: TermsOfSalePageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "termsOfSale" })
  const components = getLegalMDXComponents()
  const { content } = await loadMDX(`terms-of-sale/${locale}.mdx`, components)

  return (
    <Page name={t("title")}>
      <div className="container pt-70 pb-100">{content}</div>
    </Page>
  )
}
