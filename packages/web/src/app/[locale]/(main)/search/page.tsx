import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import Search from "@/components/search"
import { pageMetadata } from "@/libs/seo"
import type { LocaleParamsProps } from "@/libs/slug-params"

export async function generateMetadata({ params }: LocaleParamsProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "search" })
  return pageMetadata({ locale, pathname: "/search", title: t("title"), noindex: true })
}

export default async function SearchPage(props: {
  searchParams?: Promise<{ [input: string]: string | undefined }>
}) {
  const searchParams = await props.searchParams
  return <Search input={searchParams?.input} />
}
