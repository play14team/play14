"use client"

import { useEffect, useState } from "react"
import type { FinanceData } from "@/app/(admin)/admin/events/[slug]/finance.action"

interface Props {
  financeData: FinanceData | null
  onChange: (data: FinanceData | null) => void
  defaultRevenue?: number
}

export default function FinanceEditor({ financeData, onChange, defaultRevenue = 0 }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state - use defaultRevenue only when there's no existing financeData
  const [revenue, setRevenue] = useState(financeData?.revenue ?? 0)
  const [expenses, setExpenses] = useState(financeData?.expenses ?? 0)
  const [destination, setDestination] = useState(financeData?.destination ?? "")

  // Update form state when financeData prop changes
  useEffect(() => {
    setRevenue(financeData?.revenue ?? 0)
    setExpenses(financeData?.expenses ?? 0)
    setDestination(financeData?.destination ?? "")
  }, [financeData])

  // When entering edit mode without existing data, use defaultRevenue
  const handleStartEditing = () => {
    if (!financeData && defaultRevenue > 0) {
      setRevenue(defaultRevenue)
    }
    setIsEditing(true)
  }

  // Auto-calculated values
  const resultAmount = Math.abs(revenue - expenses)
  const result: "Profit" | "Loss" = revenue >= expenses ? "Profit" : "Loss"

  const resetForm = () => {
    setRevenue(financeData?.revenue ?? 0)
    setExpenses(financeData?.expenses ?? 0)
    setDestination(financeData?.destination ?? "")
    setIsEditing(false)
    setError(null)
  }

  const handleSave = () => {
    // Validate
    if (revenue < 0 || expenses < 0) {
      setError("Revenue and expenses must be positive numbers")
      return
    }

    if (result === "Profit" && !destination.trim()) {
      setError("Please specify where the surplus goes")
      return
    }

    const data: FinanceData = {
      revenue,
      expenses,
      destination: destination.trim(),
    }

    onChange(data)
    setIsEditing(false)
    setError(null)
  }

  const handleClear = () => {
    if (!confirm("Are you sure you want to clear the finance data?")) {
      return
    }
    onChange(null)
    setRevenue(0)
    setExpenses(0)
    setDestination("")
    setIsEditing(false)
    setError(null)
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
          <i className="bx bx-error-circle" />
          {error}
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
                  onChange={(e) => setRevenue(Number.parseFloat(e.target.value) || 0)}
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
                  onChange={(e) => setExpenses(Number.parseFloat(e.target.value) || 0)}
                  className="admin-input"
                  placeholder="0.00"
                />
              </div>
              <p className="admin-form-help">Total costs including venue, catering, etc.</p>
            </div>
          </div>

          <div className="admin-form-group">
            <label>Destination {result === "Profit" && <span className="required">*</span>}</label>
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
              <i className={`bx ${result === "Profit" ? "bx-trending-up" : "bx-trending-down"}`} />
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
              className="admin-btn admin-btn-primary admin-btn-sm"
            >
              Done
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="admin-btn admin-btn-secondary admin-btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // View mode
        <div className="finance-view">
          {financeData ? (
            <>
              <div className="finance-summary">
                <div className="finance-item">
                  <span className="finance-label">Revenue</span>
                  <span className="finance-value">{formatCurrency(financeData.revenue)}</span>
                </div>
                <div className="finance-item">
                  <span className="finance-label">Expenses</span>
                  <span className="finance-value">{formatCurrency(financeData.expenses)}</span>
                </div>
                <div className={`finance-item finance-result ${result.toLowerCase()}`}>
                  <span className="finance-label">{result}</span>
                  <span className="finance-value">{formatCurrency(resultAmount)}</span>
                </div>
              </div>
              {financeData.destination && (
                <div className="finance-destination">
                  <span className="finance-label">Destination</span>
                  <span className="finance-value">{financeData.destination}</span>
                </div>
              )}
            </>
          ) : (
            <p className="finance-empty">No financial data recorded yet.</p>
          )}

          <div className="finance-view-actions">
            <button
              type="button"
              onClick={handleStartEditing}
              className="admin-btn admin-btn-secondary"
            >
              <i className="bx bx-edit" />
              {financeData ? "Edit Finance Data" : "Add Finance Data"}
            </button>
            {financeData && (
              <button
                type="button"
                onClick={handleClear}
                className="admin-btn admin-btn-danger admin-btn-sm"
              >
                <i className="bx bx-trash" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
