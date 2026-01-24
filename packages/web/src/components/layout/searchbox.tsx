"use client"

import SearchCommand from "@/components/ui/search-command"
import { useEffect, useState } from "react"

const SearchBox = () => {
  const [isOpen, setIsOpen] = useState(false)

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="others-option d-flex align-items-center">
      <div className="option-item">
        <button
          type="button"
          className="ui-search-trigger"
          onClick={() => setIsOpen(true)}
          aria-label="Open search"
        >
          <i className="flaticon-loupe" aria-hidden="true" />
          <span className="ui-search-trigger-text">Search...</span>
          <kbd className="ui-search-trigger-kbd">⌘K</kbd>
        </button>
        <SearchCommand isOpen={isOpen} onOpenChange={setIsOpen} />
      </div>
    </div>
  )
}

export default SearchBox
