"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { searchQuick } from "@/components/search/search-quick.action"
import { EMPTY_SEARCH_RESULTS } from "@/components/search/search-quick.constants"
import { useDebounce } from "@/hooks/use-debounce"
import {
  type QuickSearchResults,
  type ScoredSearchItem,
  useFuzzySearch,
} from "@/hooks/use-fuzzy-search"
import SearchItem from "./search-item"

interface SearchCommandProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

interface SearchGroup {
  label: string
  items: ScoredSearchItem[]
}

export default function SearchCommand({ isOpen, onOpenChange }: SearchCommandProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<QuickSearchResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const debouncedQuery = useDebounce(query, 300)
  const scoredResults = useFuzzySearch(results, debouncedQuery)

  // Combine all results, sort by score, then re-group by type
  const { groups, flatItems } = useMemo(() => {
    if (!scoredResults) return { groups: [] as SearchGroup[], flatItems: [] as ScoredSearchItem[] }

    // Combine all items with their type
    const allItems = [
      ...scoredResults.events,
      ...scoredResults.players,
      ...scoredResults.games,
      ...scoredResults.articles,
    ]

    // Sort by score (lower is better in Fuse.js)
    const sortedItems = [...allItems].sort((a, b) => a.score - b.score)

    // Re-group sorted items by type while preserving score order
    const typeOrder: Array<ScoredSearchItem["type"]> = ["event", "player", "game", "article"]
    const typeLabels: Record<ScoredSearchItem["type"], string> = {
      event: "Events",
      player: "Players",
      game: "Games",
      article: "Articles",
    }

    // Find the best score for each type to determine group order
    const bestScoreByType = new Map<ScoredSearchItem["type"], number>()
    for (const item of sortedItems) {
      if (!bestScoreByType.has(item.type)) {
        bestScoreByType.set(item.type, item.score)
      }
    }

    // Sort types by their best score
    const sortedTypes = typeOrder
      .filter((type) => bestScoreByType.has(type))
      .sort((a, b) => (bestScoreByType.get(a) ?? 1) - (bestScoreByType.get(b) ?? 1))

    // Build groups in score order
    const g: SearchGroup[] = []
    for (const type of sortedTypes) {
      const items = sortedItems.filter((item) => item.type === type)
      if (items.length > 0) {
        g.push({ label: typeLabels[type], items })
      }
    }

    return { groups: g, flatItems: sortedItems }
  }, [scoredResults])

  // Fetch results when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)
    searchQuick(debouncedQuery)
      .then((data) => {
        setResults(data)
        setError(null)
      })
      .catch((err) => {
        console.error("[SearchCommand] Search failed:", {
          query: debouncedQuery,
          queryLength: debouncedQuery.length,
          timestamp: new Date().toISOString(),
          error: err instanceof Error ? err.message : String(err),
        })
        setError("Unable to perform search. Please try again.")
        setResults(EMPTY_SEARCH_RESULTS)
      })
      .finally(() => setIsLoading(false))
  }, [debouncedQuery])

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setResults(null)
      setError(null)
      setActiveIndex(0)
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [flatItems.length])

  // Navigate to result
  const handleSelect = useCallback(
    (item: ScoredSearchItem) => {
      onOpenChange(false)
      router.push(item.href)
    },
    [onOpenChange, router]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setActiveIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : prev))
          break
        case "ArrowUp":
          e.preventDefault()
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev))
          break
        case "Enter":
          e.preventDefault()
          if (activeIndex < flatItems.length && flatItems[activeIndex]) {
            handleSelect(flatItems[activeIndex])
          } else if (query.length >= 2) {
            // Navigate to full search if no item selected
            onOpenChange(false)
            router.push(`/search?input=${encodeURIComponent(query)}`)
          }
          break
      }
    },
    [flatItems, activeIndex, handleSelect, query, onOpenChange, router]
  )

  const hasResults = scoredResults && scoredResults.totalCount > 0

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-search-overlay" />
        <Dialog.Content className="ui-search-content">
          <Dialog.Title className="visually-hidden">Search</Dialog.Title>
          <Dialog.Description className="visually-hidden">
            Search events, players, games, and articles
          </Dialog.Description>
          <div className="ui-search-header">
            <i className="bx bx-search" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              className="ui-search-input"
              placeholder="Search events, players, games..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Search"
            />
            {isLoading && <i className="bx bx-loader-alt bx-spin" aria-hidden="true" />}
          </div>

          <div className="ui-search-results">
            {hasResults &&
              groups.map((group) => {
                const groupStartIndex = flatItems.findIndex(
                  (item) => item.documentId === group.items[0]?.documentId
                )
                return (
                  <div
                    key={group.label}
                    className="ui-search-group"
                    role="group"
                    aria-label={group.label}
                  >
                    <div className="ui-search-group-label">{group.label}</div>
                    {group.items.map((item, itemIndex) => (
                      <SearchItem
                        key={item.documentId}
                        item={item}
                        isActive={activeIndex === groupStartIndex + itemIndex}
                        onClick={() => handleSelect(item)}
                      />
                    ))}
                  </div>
                )
              })}

            {query.length >= 2 && !isLoading && error && (
              <div className="ui-search-empty">
                <i className="bx bx-error-circle" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {query.length >= 2 && !isLoading && !error && !hasResults && (
              <div className="ui-search-empty">
                <i className="bx bx-search-alt" aria-hidden="true" />
                <span>No results found for "{query}"</span>
              </div>
            )}

            {query.length > 100 && (
              <div className="ui-search-hint">
                <i className="bx bx-error-circle" aria-hidden="true" />
                <span>Search query too long (max 100 characters)</span>
              </div>
            )}

            {query.length < 2 && (
              <div className="ui-search-hint">
                <i className="bx bx-info-circle" aria-hidden="true" />
                <span>Type at least 2 characters to search</span>
              </div>
            )}
          </div>

          <div className="ui-search-footer">
            <span className="ui-search-footer-hints">
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              <span>to navigate</span>
              <kbd>↵</kbd>
              <span>to select</span>
              <kbd>esc</kbd>
              <span>to close</span>
            </span>
            {query.length >= 2 && (
              <a
                href={`/search?input=${encodeURIComponent(query)}`}
                className="ui-search-footer-link"
                onClick={() => onOpenChange(false)}
              >
                View all results
              </a>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
