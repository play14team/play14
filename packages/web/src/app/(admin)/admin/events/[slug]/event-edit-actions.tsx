"use client"

import Link from "next/link"
import { formatCurrency } from "@/libs/currencies"
import type { BudgetLineItem } from "./budget.types"
import type { ResultLineItem } from "./results.types"
import type { TabId } from "./event-edit-tabs"
import type { TicketType } from "./ticket-type.action"

interface BudgetSummary {
  totalIncome: number
  totalExpenses: number
  margin: number
}

interface EventEditActionsProps {
  eventSlug: string
  eventStatus: string
  isPublished: boolean
  isSubmitting: boolean
  isPublishing: boolean
  isDirty: boolean
  onEventStatusChange: (value: string) => void
  onPublishToggle: () => void
  onDiscard: () => void
  activeTab?: TabId
  budgetItems?: BudgetLineItem[]
  resultItems?: ResultLineItem[]
  ticketRevenue?: number
  currency?: string
  ticketTypes?: TicketType[]
  registrationLink?: string
  registrationWidgetCode?: string
}

const INCOME_CATEGORIES = ["tickets", "sponsors", "other_income"] as const
const EXPENSE_CATEGORIES = [
  "security",
  "insurance",
  "food",
  "goodies",
  "supplies",
  "venue",
  "organizer_expenses",
  "other_expense",
] as const

function calculateBudgetSummary(items: BudgetLineItem[]): BudgetSummary {
  let totalIncome = 0
  let totalExpenses = 0

  for (const item of items) {
    if (INCOME_CATEGORIES.includes(item.category as any)) {
      totalIncome += item.total || 0
    } else if (EXPENSE_CATEGORIES.includes(item.category as any)) {
      totalExpenses += item.total || 0
    }
  }

  return {
    totalIncome,
    totalExpenses,
    margin: totalIncome - totalExpenses,
  }
}

function calculateResultsSummary(items: ResultLineItem[], ticketRevenue: number = 0): BudgetSummary {
  let manualIncome = 0
  let totalExpenses = 0

  for (const item of items) {
    if (INCOME_CATEGORIES.includes(item.category as any)) {
      manualIncome += item.amount || 0
    } else if (EXPENSE_CATEGORIES.includes(item.category as any)) {
      totalExpenses += item.amount || 0
    }
  }

  // Total income includes ticket revenue
  const totalIncome = ticketRevenue + manualIncome

  return {
    totalIncome,
    totalExpenses,
    margin: totalIncome - totalExpenses,
  }
}

export default function EventEditActions({
  eventSlug,
  eventStatus,
  isPublished,
  isSubmitting,
  isPublishing,
  isDirty,
  onEventStatusChange,
  onPublishToggle,
  onDiscard,
  activeTab,
  budgetItems = [],
  resultItems = [],
  ticketRevenue = 0,
  currency = "eur",
  ticketTypes = [],
  registrationLink = "",
  registrationWidgetCode = "",
}: EventEditActionsProps) {
  const showBudgetSummary = activeTab === "budget" || activeTab === "actuals"
  const budgetSummary = calculateBudgetSummary(budgetItems)
  const resultsSummary = calculateResultsSummary(resultItems, ticketRevenue)
  const isRegistrationOpen = eventStatus === "Open"
  const hasInternalTickets = ticketTypes.length > 0
  const hasExternalRegistration = Boolean(
    registrationLink.trim() || registrationWidgetCode.trim()
  )
  const canOpenRegistration = hasInternalTickets || hasExternalRegistration
  const openRegistrationHint = isRegistrationOpen
    ? "Registration is already open."
    : canOpenRegistration
    ? "Set the event status to Open."
    : "Add a ticket type or external registration link/widget to open registration."

  // Helper to format currency with event's currency (no decimal places for summary)
  const fmt = (amount: number) => formatCurrency(amount, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const handleOpenRegistration = () => {
    if (!isRegistrationOpen && canOpenRegistration) {
      onEventStatusChange("Open")
    }
  }

  return (
    <div className="event-edit-actions">
      {/* Publication Status */}
      <div className="action-status">
        <span className={`publication-badge ${isPublished ? "published" : "draft"}`}>
          {isPublished ? (
            <>
              <i className="bx bx-check-circle"></i>
              Published
            </>
          ) : (
            <>
              <i className="bx bx-edit"></i>
              Draft
            </>
          )}
        </span>
        <p className="status-description">
          {isPublished ? "This event is visible to the public." : "Only visible to organizers."}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        {!isPublished && (
          <Link
            href={`/admin/events/${eventSlug}/preview`}
            className="admin-btn admin-btn-secondary admin-btn-block"
          >
            <i className="bx bx-show"></i>
            Preview
          </Link>
        )}

        {isPublished && (
          <Link
            href={`/events/${eventSlug}`}
            className="admin-btn admin-btn-secondary admin-btn-block"
            target="_blank"
          >
            <i className="bx bx-link-external"></i>
            View public page
          </Link>
        )}

        <button
          type="button"
          onClick={onPublishToggle}
          disabled={isPublishing}
          className={`admin-btn admin-btn-block ${isPublished ? "admin-btn-danger" : "admin-btn-success"}`}
        >
          {isPublishing ? (
            <>
              <i className="bx bx-loader-alt bx-spin"></i>
              {isPublished ? "Unpublishing..." : "Publishing..."}
            </>
          ) : isPublished ? (
            <>
              <i className="bx bx-hide"></i>
              Unpublish
            </>
          ) : (
            <>
              <i className="bx bx-globe"></i>
              Publish
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleOpenRegistration}
          disabled={isRegistrationOpen || !canOpenRegistration}
          title={openRegistrationHint}
          className={`admin-btn admin-btn-block ${isRegistrationOpen ? "admin-btn-secondary" : "admin-btn-success"}`}
        >
          <i className="bx bx-door-open"></i>
          {isRegistrationOpen ? "Registration is open" : "Open registration"}
        </button>

        <hr />

        <button
          type="submit"
          disabled={isSubmitting}
          className={`admin-btn admin-btn-primary admin-btn-block ${isDirty ? "admin-btn-dirty" : ""}`}
          data-save-shortcut
        >
          {isSubmitting ? (
            <>
              <i className="bx bx-loader-alt bx-spin"></i>
              Saving...
            </>
          ) : (
            <>
              <i className="bx bx-save"></i>
              Save changes
            </>
          )}
        </button>

        {isDirty && (
          <button
            type="button"
            onClick={onDiscard}
            className="admin-btn admin-btn-danger-outline admin-btn-block"
          >
            <i className="bx bx-undo"></i>
            Discard changes
          </button>
        )}
      </div>

      {/* Budget Summary - shown on budget/actuals tabs */}
      {showBudgetSummary && (
        <>
          <hr />
          <div className="action-budget-summary">
          <h4>
            <i className="bx bx-calculator"></i>
            {activeTab === "budget" ? "Budget" : "Results"} Summary
          </h4>

          {activeTab === "budget" ? (
            <div className="budget-summary-compact">
              <div className="summary-row income">
                <span className="summary-label">Income</span>
                <span className="summary-value">{fmt(budgetSummary.totalIncome)}</span>
              </div>
              <div className="summary-row expenses">
                <span className="summary-label">Expenses</span>
                <span className="summary-value">{fmt(budgetSummary.totalExpenses)}</span>
              </div>
              <div className={`summary-row margin ${budgetSummary.margin >= 0 ? "positive" : "negative"}`}>
                <span className="summary-label">Margin</span>
                <span className="summary-value">
                  {budgetSummary.margin >= 0 ? "+" : ""}
                  {fmt(budgetSummary.margin)}
                </span>
              </div>
            </div>
          ) : (
            <div className="budget-summary-compact">
              <div className="summary-section-label">Budget</div>
              <div className={`summary-row margin ${budgetSummary.margin >= 0 ? "positive" : "negative"}`}>
                <span className="summary-label">Projected</span>
                <span className="summary-value">
                  {budgetSummary.margin >= 0 ? "+" : ""}
                  {fmt(budgetSummary.margin)}
                </span>
              </div>
              <div className="summary-section-label">Actuals</div>
              <div className="summary-row income">
                <span className="summary-label">Income</span>
                <span className="summary-value">{fmt(resultsSummary.totalIncome)}</span>
              </div>
              <div className="summary-row expenses">
                <span className="summary-label">Expenses</span>
                <span className="summary-value">{fmt(resultsSummary.totalExpenses)}</span>
              </div>
              <div className={`summary-row margin ${resultsSummary.margin >= 0 ? "positive" : "negative"}`}>
                <span className="summary-label">Result</span>
                <span className="summary-value">
                  {resultsSummary.margin >= 0 ? "+" : ""}
                  {fmt(resultsSummary.margin)}
                </span>
              </div>
            </div>
          )}
          </div>
        </>
      )}

      {/* Dirty State Indicator - at bottom to avoid layout shift */}
      {isDirty && (
        <div className="dirty-indicator">
          <i className="bx bx-edit-alt"></i>
          <span>You have unsaved changes</span>
        </div>
      )}
    </div>
  )
}
