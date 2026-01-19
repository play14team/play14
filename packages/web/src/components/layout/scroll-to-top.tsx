"use client"

import { useEffect, useState } from "react"
import "./scroll-to-top.scss"

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener("scroll", toggleVisibility)

    return () => {
      window.removeEventListener("scroll", toggleVisibility)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <button
      className={`scroll-to-top ${isVisible ? "visible" : ""}`}
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
    >
      <i className="bx bx-chevron-up" />
    </button>
  )
}
