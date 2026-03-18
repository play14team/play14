"use client"

import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import type { FinanceData } from "@/app/[locale]/(admin)/admin/events/[slug]/finance.action"

interface Props {
  financeData: FinanceData | null
  onChange: (data: FinanceData | null) => void
  defaultRevenue?: number
}

export default function FinanceEditor({ financeData, onChange, defaultRevenue = 0 }: Props) {
  const t = useTranslations("adminEvents.finance")
  const locale = useLocale()
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
  const resultType: "profit" | "loss" = revenue >= expenses ? "profit" : "loss"

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
      setError(t("revenueExpensesPositive"))
      return
    }

    if (resultType === "profit" && !destination.trim()) {
      setError(t("destinationRequired"))
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
    if (!confirm(t("confirmClear"))) {
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
    return new Intl.NumberFormat(locale, {
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
              <label>{t("revenue")}</label>
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
              <p className="admin-form-help">{t("revenueHelp")}</p>
            </div>

            <div className="admin-form-group">
              <label>{t("expenses")}</label>
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
              <p className="admin-form-help">{t("expensesHelp")}</p>
            </div>
          </div>

          <div className="admin-form-group">
            <label>
              {t("destination")} {resultType === "profit" && <span className="required">*</span>}
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="admin-input"
              placeholder={t("destinationPlaceholder")}
            />
            <p className="admin-form-help">{t("destinationHelp")}</p>
          </div>

          {/* Auto-calculated result preview */}
          <div className={`finance-result-preview ${resultType}`}>
            <div className="finance-result-icon">
              <i
                className={`bx ${resultType === "profit" ? "bx-trending-up" : "bx-trending-down"}`}
              />
            </div>
            <div className="finance-result-info">
              <span className="finance-result-label">{t(resultType)}</span>
              <span className="finance-result-amount">{formatCurrency(resultAmount)}</span>
            </div>
          </div>

          <div className="finance-actions">
            <button
              type="button"
              onClick={handleSave}
              className="admin-btn admin-btn-primary admin-btn-sm"
            >
              {t("done")}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="admin-btn admin-btn-secondary admin-btn-sm"
            >
              {t("cancel")}
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
                  <span className="finance-label">{t("revenue")}</span>
                  <span className="finance-value">{formatCurrency(financeData.revenue)}</span>
                </div>
                <div className="finance-item">
                  <span className="finance-label">{t("expenses")}</span>
                  <span className="finance-value">{formatCurrency(financeData.expenses)}</span>
                </div>
                <div className={`finance-item finance-result ${resultType}`}>
                  <span className="finance-label">{t(resultType)}</span>
                  <span className="finance-value">{formatCurrency(resultAmount)}</span>
                </div>
              </div>
              {financeData.destination && (
                <div className="finance-destination">
                  <span className="finance-label">{t("destination")}</span>
                  <span className="finance-value">{financeData.destination}</span>
                </div>
              )}
            </>
          ) : (
            <p className="finance-empty">{t("noFinanceData")}</p>
          )}

          <div className="finance-view-actions">
            <button
              type="button"
              onClick={handleStartEditing}
              className="admin-btn admin-btn-secondary"
            >
              <i className="bx bx-edit" />
              {financeData ? t("editFinanceData") : t("addFinanceData")}
            </button>
            {financeData && (
              <button
                type="button"
                onClick={handleClear}
                className="admin-btn admin-btn-danger admin-btn-sm"
              >
                <i className="bx bx-trash" />
                {t("clear")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
