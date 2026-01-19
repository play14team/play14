import Link from "next/link"
import { getRandomTestimonials } from "./get.action"
import TestimonialsRefresh from "./testimonials-refresh"

const HomeTestimonials = async () => {
  const testimonials = await getRandomTestimonials(4)

  if (!testimonials || testimonials.length === 0) {
    return null
  }

  return (
    <div className="container">
      <TestimonialsRefresh initialTestimonials={testimonials} />

      <div className="d-flex justify-content-center pb-70 pt-70">
        <Link href="/events/testimonials" className="default-btn">
          View all testimonials
        </Link>
      </div>
    </div>
  )
}

export default HomeTestimonials
