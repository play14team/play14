"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { searchClaimableEvents, type ClaimableEvent } from "./claim-attendance.action"

interface EventSearchProps {
  events: ClaimableEvent[]
  onSelectEvent: (event: ClaimableEvent) => void
}

export default function EventSearch({ events, onSelectEvent }: EventSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ClaimableEvent[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Display either search results or all events
  const displayEvents = searchQuery.length >= 2 ? searchResults : events

  useEffect(() => {
    const searchEvents = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      const result = await searchClaimableEvents(searchQuery)
      if (result.success) {
        setSearchResults(result.events || [])
      }
      setIsSearching(false)
    }

    const debounce = setTimeout(searchEvents, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="event-search">
      <div className="event-search-form">
        <div className="form-group">
          <label htmlFor="event-search">Search Events</label>
          <input
            id="event-search"
            type="text"
            placeholder="Search events by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {isSearching && (
          <button type="button" className="admin-btn admin-btn-secondary" disabled>
            <i className="bx bx-loader-alt bx-spin"></i>
          </button>
        )}
      </div>

      {!searchQuery && events.length > 0 && (
        <div className="event-search-hint">
          <i className="bx bx-info-circle"></i>
          <span>Showing {events.length} events you can claim attendance for</span>
        </div>
      )}

      {displayEvents.length === 0 ? (
        <div className="event-search-empty">
          {searchQuery.length >= 2 ? (
            <>
              <i className="bx bx-search-alt"></i>
              <p>No events found matching &ldquo;{searchQuery}&rdquo;</p>
            </>
          ) : (
            <>
              <i className="bx bx-check-circle"></i>
              <p>No events available to claim</p>
              <span>You may have already attended or claimed all available events</span>
            </>
          )}
        </div>
      ) : (
        <div className="event-search-results">
          {displayEvents.map((event) => (
            <div key={event.documentId} className="event-search-item">
              <div className="event-search-item-image">
                {event.defaultImage?.url ? (
                  <Image
                    src={event.defaultImage.url}
                    alt={event.name}
                    width={100}
                    height={80}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                    unoptimized
                  />
                ) : (
                  <div className="event-search-item-image-placeholder">
                    <i className="bx bx-calendar-event"></i>
                  </div>
                )}
              </div>
              <div className="event-search-item-content">
                <h4 className="event-search-item-name">{event.name}</h4>
                <div className="event-search-item-meta">
                  <span>
                    <i className="bx bx-calendar"></i>
                    {formatDate(event.start)}
                  </span>
                  {event.location?.name && (
                    <span>
                      <i className="bx bx-map"></i>
                      {event.location.name}
                    </span>
                  )}
                </div>
                <div className="event-search-item-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary admin-btn-sm"
                    onClick={() => onSelectEvent(event)}
                  >
                    <i className="bx bx-plus"></i>
                    Claim Attendance
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
