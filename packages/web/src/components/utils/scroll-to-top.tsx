"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

/**
 * Component that scrolls to top when the pathname changes.
 * This fixes the issue where navigating between pages doesn't reset scroll position.
 */
export default function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
