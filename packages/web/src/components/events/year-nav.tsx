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
    <div className="year-nav centered">
      <div className="year-buttons">
        <Link
          href="/events"
          prefetch={false}
          className={`year-btn ${!currentYear ? "active" : ""}`}
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
            >
              {year}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
