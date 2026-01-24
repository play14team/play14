import Link from "next/link"
import type { ReactNode } from "react"
import Collapsible from "../layout/collapsible"

export default function Filters({ name }: { name: ReactNode }) {
  return (
    <div className="blog-details-desc pb-5">
      <Collapsible name={name}>
        <h5 className="pt-5">Filter by</h5>
        <div className="article-footer">
          <div className="article-tags">
            <span>
              <i className="bx bx-globe" aria-hidden="true" />
            </span>
            <Link href="/events/countries">Country</Link>
          </div>
          <div className="article-tags">
            <span>
              <i className="bx bx-calendar" aria-hidden="true" />
            </span>
            <Link href="/events/statuses">Status</Link>
          </div>
          <div className="article-tags">
            <span>
              <i className="bx bx-map-pin" aria-hidden="true" />
            </span>
            <Link href="/events/locations">Location</Link>
          </div>
        </div>
      </Collapsible>
    </div>
  )
}
