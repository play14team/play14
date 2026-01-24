"use client"

import Link from "next/link"
import "./year-nav.scss"

const START_YEAR = 2014
const CURRENT_YEAR = new Date().getFullYear()

interface YearNavProps {
  currentYear?: number
  yearCounts: Record<number, number>
}

function getYears(yearCounts: Record<number, number>): number[] {
  const years: number[] = []
  const maxYearWithEvents = Math.max(CURRENT_YEAR, ...Object.keys(yearCounts).map(Number))

  for (let year = maxYearWithEvents; year >= START_YEAR; year--) {
    years.push(year)
  }

  return years
}

export default function YearNav({ currentYear, yearCounts }: YearNavProps) {
  const years = getYears(yearCounts)

  return (
    <nav className="year-nav centered" aria-label="Filter events by year">
      <div className="year-buttons">
        <Link
          href="/events"
          prefetch={false}
          className={`year-btn ${!currentYear ? "active" : ""}`}
          aria-current={!currentYear ? "page" : undefined}
        >
          All
        </Link>
        {years.map((year) => {
          const isActive = currentYear === year

          return (
            <Link
              key={year}
              href={`/events/year/${year}`}
              prefetch={false}
              className={`year-btn ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {year}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
