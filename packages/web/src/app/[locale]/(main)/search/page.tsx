import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import Search from "@/components/search"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("search")
  return {
    title: t("title"),
  }
}

export default async function SearchPage(props: {
  searchParams?: Promise<{ [input: string]: string | undefined }>
}) {
  const searchParams = await props.searchParams
  return <Search input={searchParams?.input} />
}
