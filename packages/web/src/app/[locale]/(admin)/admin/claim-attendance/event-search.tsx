"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { type ClaimableEvent, searchClaimableEvents } from "./claim-attendance.action"

interface EventSearchProps {
  events: ClaimableEvent[]
  onSelectEvent: (event: ClaimableEvent) => void
}

export default function EventSearch({ events, onSelectEvent }: EventSearchProps) {
  const t = useTranslations("adminMisc.claims.claimAttendance")
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
          <label htmlFor="event-search">{t("searchLabel")}</label>
          <input
            id="event-search"
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {isSearching && (
          <button type="button" className="admin-btn admin-btn-secondary" disabled>
            <i className="bx bx-loader-alt bx-spin" />
          </button>
        )}
      </div>

      {!searchQuery && events.length > 0 && (
        <div className="event-search-hint">
          <i className="bx bx-info-circle" />
          <span>{t("showingEvents", { count: events.length })}</span>
        </div>
      )}

      {displayEvents.length === 0 ? (
        <div className="event-search-empty">
          {searchQuery.length >= 2 ? (
            <>
              <i className="bx bx-search-alt" />
              <p>{t("noEventsSearch", { query: searchQuery })}</p>
            </>
          ) : (
            <>
              <i className="bx bx-check-circle" />
              <p>{t("noEventsAvailable")}</p>
              <span>{t("noEventsHint")}</span>
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
                    <i className="bx bx-calendar-event" />
                  </div>
                )}
              </div>
              <div className="event-search-item-content">
                <h4 className="event-search-item-name">{event.name}</h4>
                <div className="event-search-item-meta">
                  <span>
                    <i className="bx bx-calendar" />
                    {formatDate(event.start)}
                  </span>
                  {event.location?.name && (
                    <span>
                      <i className="bx bx-map" />
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
                    <i className="bx bx-plus" />
                    {t("claimAttendance")}
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
