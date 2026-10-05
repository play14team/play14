import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { getTestimonials } from "@/components/events/get.action"
import TestimonialItem from "@/components/events/testimonial"
import Page from "@/components/layout/page"
import { pageMetadata } from "@/libs/seo"
import type { LocaleParamsProps } from "@/libs/slug-params"
import type { Testimonial } from "@/models/strapi"

export async function generateMetadata({ params }: LocaleParamsProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "events" })
  return pageMetadata({ locale, pathname: "/events/testimonials", title: t("testimonialsTitle") })
}

export default async function Testimonials() {
  const t = await getTranslations("events")
  const testimonials = (await getTestimonials()) as Testimonial[]

  return (
    <Page name={t("testimonialsTitle")}>
      <div className="testimonials-area pt-100 pb-70 bg-f1f8fb">
        <div className="container">
          <div className="row">
            {testimonials.map((testimonial) => (
              <TestimonialItem key={testimonial.documentId} testimonial={testimonial} />
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}
