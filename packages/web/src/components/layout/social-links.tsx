"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export default function SocialLinks({
  text,
  className,
}: {
  text: string
  className: string
}) {
  const pathname = usePathname()
  const [url, setUrl] = useState(pathname)

  useEffect(() => {
    // Set full URL only on client to avoid hydration mismatch
    setUrl(`${window.location.origin}${pathname}`)
  }, [pathname])

  return (
    <ul className={className}>
      <li key="facebook">
        <Link
          href={`http://www.facebook.com/sharer.php?u=${url}&p[title]=${text}`}
          target="_blank"
          rel="noopener"
          className="d-block"
        >
          <i className="bx bxl-facebook" />
        </Link>
      </li>
      <li key="twitter">
        <Link
          href={`http://twitter.com/share?url=${url}&text=${text}`}
          target="_blank"
          rel="noopener"
          className="d-block"
        >
          <i className="bx bxl-twitter" />
        </Link>
      </li>
      <li key="pinterest">
        <Link
          href={`http://pinterest.com/pin/create/button/?url=${url}&description=${text}`}
          target="_blank"
          rel="noopener"
          className="d-block"
        >
          <i className="bx bxl-pinterest" />
        </Link>
      </li>
      <li key="linkedin">
        <Link
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${text}`}
          target="_blank"
          rel="noopener"
          className="d-block"
        >
          <i className="bx bxl-linkedin" />
        </Link>
      </li>
    </ul>
  )
}
