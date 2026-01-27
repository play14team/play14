"use client"

import Image from "next/image"
import Link from "next/link"
import type { UploadFile } from "@/models/strapi"

// ============================================================================
// TYPES
// ============================================================================

export interface EventCardData {
  documentId: string
  slug: string
  name: string
  start: string
  end: string
  eventStatus?: string
  isPublished?: boolean
  defaultImage?: UploadFile | null
  location?: {
    name: string
    country?: string
  } | null
}

export type BadgeType =
  | { type: "status"; value: string }
  | { type: "draft" }
  | { type: "source"; value: "ticket" | "claim" | "direct" }
  | { type: "custom"; label: string; icon?: string; variant?: string }

export type ActionType =
  | { type: "link"; label: string; href: string }
  | { type: "button"; label: string; onClick: () => void; disabled?: boolean; loading?: boolean }

export interface QuickAction {
  icon: string
  title: string
  onClick?: (e: React.MouseEvent) => void
  href?: string
  disabled?: boolean
  loading?: boolean
  variant?: "default" | "published" | "draft"
}

export interface EventCardProps {
  event: EventCardData
  badges?: BadgeType[]
  action: ActionType
  quickActions?: QuickAction[]
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function formatEventDate(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }

  const endStr = endDate.toLocaleDateString("en-US", options)

  if (startDate.getFullYear() === endDate.getFullYear()) {
    const startShort = startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    return `${startShort} - ${endStr}`
  }

  const startStr = startDate.toLocaleDateString("en-US", options)
  return `${startStr} - ${endStr}`
}

function getStatusClass(status: string): string {
  switch (status) {
    case "Open":
      return "event-card-badge-open"
    case "Announced":
      return "event-card-badge-announced"
    case "Over":
      return "event-card-badge-over"
    case "Cancelled":
      return "event-card-badge-cancelled"
    default:
      return ""
  }
}

function getSourceInfo(source: "ticket" | "claim" | "direct"): { label: string; icon: string } {
  switch (source) {
    case "ticket":
      return { label: "Ticket", icon: "bx-purchase-tag" }
    case "claim":
      return { label: "Claimed", icon: "bx-check-circle" }
    case "direct":
      return { label: "Added", icon: "bx-user-plus" }
  }
}

// ============================================================================
// BADGE COMPONENT
// ============================================================================

function Badge({ badge }: { badge: BadgeType }) {
  switch (badge.type) {
    case "status":
      return (
        <span className={`event-card-badge event-card-badge-status ${getStatusClass(badge.value)}`}>
          {badge.value}
        </span>
      )
    case "draft":
      return <span className="event-card-badge event-card-badge-draft">Draft</span>
    case "source": {
      const { label, icon } = getSourceInfo(badge.value)
      return (
        <span
          className={`event-card-badge event-card-badge-source event-card-badge-source-${badge.value}`}
        >
          <i className={`bx ${icon}`} />
          {label}
        </span>
      )
    }
    case "custom":
      return (
        <span
          className={`event-card-badge ${badge.variant ? `event-card-badge-${badge.variant}` : ""}`}
        >
          {badge.icon && <i className={`bx ${badge.icon}`} />}
          {badge.label}
        </span>
      )
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EventCard({
  event,
  badges = [],
  action,
  quickActions,
  className = "",
}: EventCardProps) {
  const cardContent = (
    <>
      {/* Image Section */}
      <div className="event-card-image">
        {event.defaultImage?.url ? (
          <Image
            src={event.defaultImage.url}
            alt={event.name}
            fill
            sizes="(max-width: 768px) 100vw, 340px"
            className="event-card-img"
          />
        ) : (
          <div className="event-card-placeholder">
            <i className="bx bx-calendar-event" />
          </div>
        )}
        {badges.length > 0 && (
          <div className="event-card-badges">
            {badges.map((badge, idx) => (
              <Badge key={idx} badge={badge} />
            ))}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="event-card-content">
        <h3 className="event-card-name">{event.name}</h3>

        <div className="event-card-meta">
          {event.location && (
            <span className="event-card-location">
              <i className="bx bx-map" />
              {event.location.name}
              {event.location.country && `, ${event.location.country}`}
            </span>
          )}
          <span className="event-card-dates">
            <i className="bx bx-calendar" />
            {formatEventDate(event.start, event.end)}
          </span>
        </div>

        {/* Action Section */}
        {action.type === "link" ? (
          <div className="event-card-action">
            <span>{action.label}</span>
            <i className="bx bx-chevron-right" />
          </div>
        ) : (
          <div className="event-card-action-button">
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                action.onClick()
              }}
              disabled={action.disabled || action.loading}
            >
              {action.loading ? <i className="bx bx-loader-alt bx-spin" /> : action.label}
            </button>
          </div>
        )}
      </div>
    </>
  )

  // Wrap in link or div based on action type
  const isClickableCard = action.type === "link"

  return (
    <div className={`event-card-wrapper ${className}`}>
      {isClickableCard ? (
        <Link href={action.href} className="event-card">
          {cardContent}
        </Link>
      ) : (
        <div className="event-card">{cardContent}</div>
      )}

      {/* Quick Actions Overlay (for organizer cards) */}
      {quickActions && quickActions.length > 0 && (
        <div className="event-card-quick-actions">
          {quickActions.map((qa, idx) =>
            qa.href ? (
              <Link
                key={idx}
                href={qa.href}
                className={`event-quick-btn ${qa.variant || ""}`}
                title={qa.title}
              >
                <i className={`bx ${qa.icon}`} />
              </Link>
            ) : (
              <button
                key={idx}
                type="button"
                className={`event-quick-btn ${qa.variant || ""}`}
                onClick={qa.onClick}
                disabled={qa.disabled || qa.loading}
                title={qa.title}
              >
                {qa.loading ? (
                  <i className="bx bx-loader-alt bx-spin" />
                ) : (
                  <i className={`bx ${qa.icon}`} />
                )}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
