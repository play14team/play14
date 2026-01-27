import type { Metadata } from "next"
import Search from "@/components/search"

export const metadata: Metadata = {
  title: "Search results",
}

export default async function SearchPage(props: {
  searchParams?: Promise<{ [input: string]: string | undefined }>
}) {
  const searchParams = await props.searchParams
  return <Search input={searchParams?.input} />
}
