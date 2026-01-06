"use client"

import Link from "next/link"

// ============================================================================
// TYPES
// ============================================================================

export interface EventsEmptyStateProps {
  icon?: string
  title: string
  message: string
  hint?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
    variant?: "primary" | "secondary"
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EventsEmptyState({
  icon = "bx-calendar-event",
  title,
  message,
  hint,
  action,
}: EventsEmptyStateProps) {
  return (
    <div className="events-empty-state">
      <div className="events-empty-state-icon">
        <i className={`bx ${icon}`}></i>
      </div>
      <h3 className="events-empty-state-title">{title}</h3>
      <p className="events-empty-state-message">{message}</p>
      {hint && <p className="events-empty-state-hint">{hint}</p>}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className={`admin-btn ${action.variant === "primary" ? "admin-btn-primary" : "admin-btn-secondary"}`}
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            className={`admin-btn ${action.variant === "primary" ? "admin-btn-primary" : "admin-btn-secondary"}`}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )
      )}
    </div>
  )
}
