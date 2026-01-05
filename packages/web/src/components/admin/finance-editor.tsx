"use client"

import { useState } from "react"
import {
  updateEventFinance,
  type Finance,
  type FinanceData,
} from "@/app/(admin)/admin/events/[slug]/finance.action"

interface Props {
  eventSlug: string
  finance?: Finance | null
  onUpdate: () => void
}

export default function FinanceEditor({ eventSlug, finance, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [revenue, setRevenue] = useState(finance?.revenue ?? 0)
  const [expenses, setExpenses] = useState(finance?.expenses ?? 0)
  const [destination, setDestination] = useState(finance?.destination ?? "")

  // Auto-calculated values
  const resultAmount = Math.abs(revenue - expenses)
  const result: "Profit" | "Loss" = revenue >= expenses ? "Profit" : "Loss"

  const resetForm = () => {
    setRevenue(finance?.revenue ?? 0)
    setExpenses(finance?.expenses ?? 0)
    setDestination(finance?.destination ?? "")
    setIsEditing(false)
    setError(null)
  }

  const handleSave = async () => {
    // Validate
    if (revenue < 0 || expenses < 0) {
      setError("Revenue and expenses must be positive numbers")
      return
    }

    if (result === "Profit" && !destination.trim()) {
      setError("Please specify where the surplus goes")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const data: FinanceData = {
      revenue,
      expenses,
      destination: destination.trim(),
    }

    const response = await updateEventFinance(eventSlug, data)

    setIsLoading(false)

    if (response.success) {
      setSuccess(true)
      setIsEditing(false)
      onUpdate()
      // Auto-hide success message
      setTimeout(() => setSuccess(false), 3000)
    } else {
      setError(response.error || "Failed to save finance data")
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  return (
    <div className="finance-editor">
      {error && (
        <div className="admin-alert admin-alert-error">
          <i className="bx bx-error-circle"></i>
          {error}
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success">
          <i className="bx bx-check-circle"></i>
          Finance data saved successfully
        </div>
      )}

      {isEditing ? (
        // Edit mode
        <div className="finance-form">
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Revenue</label>
              <div className="input-with-prefix">
                <span className="input-prefix">EUR</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={revenue}
                  onChange={(e) => setRevenue(parseFloat(e.target.value) || 0)}
                  className="admin-input"
                  placeholder="0.00"
                />
              </div>
              <p className="admin-form-help">Total income from tickets and sponsorships</p>
            </div>

            <div className="admin-form-group">
              <label>Expenses</label>
              <div className="input-with-prefix">
                <span className="input-prefix">EUR</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenses}
                  onChange={(e) => setExpenses(parseFloat(e.target.value) || 0)}
                  className="admin-input"
                  placeholder="0.00"
                />
              </div>
              <p className="admin-form-help">Total costs including venue, catering, etc.</p>
            </div>
          </div>

          <div className="admin-form-group">
            <label>
              Destination {result === "Profit" && <span className="required">*</span>}
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="admin-input"
              placeholder="e.g., Community fund for future events"
            />
            <p className="admin-form-help">
              Where the surplus goes (required if there is a profit)
            </p>
          </div>

          {/* Auto-calculated result preview */}
          <div className={`finance-result-preview ${result.toLowerCase()}`}>
            <div className="finance-result-icon">
              <i className={`bx ${result === "Profit" ? "bx-trending-up" : "bx-trending-down"}`}></i>
            </div>
            <div className="finance-result-info">
              <span className="finance-result-label">{result}</span>
              <span className="finance-result-amount">{formatCurrency(resultAmount)}</span>
            </div>
          </div>

          <div className="finance-actions">
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="admin-btn admin-btn-primary admin-btn-sm"
            >
              {isLoading ? (
                <>
                  <i className="bx bx-loader-alt bx-spin"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="bx bx-save"></i>
                  Save Finance Data
                </>
              )}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isLoading}
              className="admin-btn admin-btn-secondary admin-btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // View mode
        <div className="finance-view">
          {finance ? (
            <>
              <div className="finance-summary">
                <div className="finance-item">
                  <span className="finance-label">Revenue</span>
                  <span className="finance-value">{formatCurrency(finance.revenue)}</span>
                </div>
                <div className="finance-item">
                  <span className="finance-label">Expenses</span>
                  <span className="finance-value">{formatCurrency(finance.expenses)}</span>
                </div>
                <div className={`finance-item finance-result ${finance.result.toLowerCase()}`}>
                  <span className="finance-label">{finance.result}</span>
                  <span className="finance-value">{formatCurrency(finance.resultAmount)}</span>
                </div>
              </div>
              {finance.destination && (
                <div className="finance-destination">
                  <span className="finance-label">Destination</span>
                  <span className="finance-value">{finance.destination}</span>
                </div>
              )}
            </>
          ) : (
            <p className="finance-empty">No financial data recorded yet.</p>
          )}

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="admin-btn admin-btn-secondary"
          >
            <i className="bx bx-edit"></i>
            {finance ? "Edit Finance Data" : "Add Finance Data"}
          </button>
        </div>
      )}
    </div>
  )
}
