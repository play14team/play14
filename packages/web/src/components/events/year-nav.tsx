"use client"

import Link from "next/link"
import "./year-nav.scss"

interface YearNavProps {
  currentYear?: number
  yearCounts: Record<number, number>
}

export default function YearNav({ currentYear, yearCounts }: YearNavProps) {
  // Sort years descending (newest first)
  const years = Object.keys(yearCounts)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <div className="year-nav centered">
      <div className="year-buttons">
        <Link
          href="/events"
          className={`year-btn ${!currentYear ? "active" : ""}`}
        >
          All
        </Link>
        {years.map((year) => {
          const count = yearCounts[year] || 0
          const isDisabled = count === 0
          const isActive = currentYear === year

          return (
            <Link
              key={year}
              href={isDisabled ? "#" : `/events/year/${year}`}
              className={`year-btn ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
              onClick={isDisabled ? (e) => e.preventDefault() : undefined}
            >
              {year}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
