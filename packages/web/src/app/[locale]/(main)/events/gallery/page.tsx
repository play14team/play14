import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import GalleryPageContent from "@/components/events/gallery/gallery-page-content"
import { getGalleryEvents } from "@/components/events/get-gallery.action"
import Page from "@/components/layout/page"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("gallery")
  return {
    title: t("title"),
    description: t("description"),
  }
}

// Force static generation - all data fetched at build time
export const dynamic = "force-static"
export const revalidate = 3600

type Props = {
  params: Promise<{ locale: string }>
}

export default async function GalleryPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const [events, t] = await Promise.all([getGalleryEvents(), getTranslations("gallery")])

  return (
    <Page name={t("title")}>
      <GalleryPageContent events={events} />
    </Page>
  )
}
