import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { getAllEvents, getEventCountries } from "@/components/events/get.action"
import EventGrid from "@/components/events/grid"
import type { Event } from "@/models/strapi"

interface CountryEventsPageProps {
  params: Promise<{ locale: string; code: string }>
}

function isValidCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code)
}

function getCountryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale, "en"], { type: "region" }).of(code) || code
  } catch {
    return code
  }
}

export async function generateMetadata({ params }: CountryEventsPageProps): Promise<Metadata> {
  const { locale, code } = await params
  const upper = code.toUpperCase()
  if (!isValidCountryCode(upper)) return { title: "Events" }
  return {
    title: `Events – ${getCountryName(upper, locale)}`,
  }
}

export const dynamicParams = true

export async function generateStaticParams() {
  const countries = await getEventCountries()
  return countries
    .map((c) => c.toUpperCase())
    .filter(isValidCountryCode)
    .map((code) => ({ code }))
}

export default async function CountryEventsPage({ params }: CountryEventsPageProps) {
  const { locale, code } = await params
  setRequestLocale(locale)
  const upper = code.toUpperCase()

  if (!isValidCountryCode(upper)) {
    notFound()
  }

  const t = await getTranslations("events")
  const events = (await getAllEvents(undefined, undefined, upper)) as Event[]
  const countryName = getCountryName(upper, locale)

  return (
    <>
      <div className="centered pt-5 pb-5">
        <h1>{t("eventsCountry", { country: countryName })}</h1>
        <p>{t("totalCount", { count: events.length })}</p>
      </div>
      {events.length > 0 ? (
        <EventGrid events={events} />
      ) : (
        <div className="centered pt-5 pb-5">
          <p>{t("noEventsForCountry", { country: countryName })}</p>
        </div>
      )}
    </>
  )
}
