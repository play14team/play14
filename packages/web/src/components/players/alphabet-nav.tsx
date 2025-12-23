"use client"

import Link from "next/link"
import "./alphabet-nav.scss"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

interface AlphabetNavProps {
  currentLetter?: string
  letterCounts: Record<string, number>
}

export default function AlphabetNav({
  currentLetter,
  letterCounts,
}: AlphabetNavProps) {
  return (
    <div className="alphabet-nav centered">
      <div className="alphabet-buttons">
        <Link
          href="/players"
          className={`alphabet-btn ${!currentLetter ? "active" : ""}`}
        >
          All
        </Link>
        {ALPHABET.map((letter) => {
          const count = letterCounts[letter] || 0
          const isDisabled = count === 0
          const isActive = currentLetter === letter

          return (
            <Link
              key={letter}
              href={isDisabled ? "#" : `/players/name/${letter}`}
              className={`alphabet-btn ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
              onClick={isDisabled ? (e) => e.preventDefault() : undefined}
            >
              {letter}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
