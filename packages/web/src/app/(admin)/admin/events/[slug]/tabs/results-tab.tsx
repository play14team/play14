"use client"

import { useState, useMemo, useCallback } from "react"
import { useToast } from "@/components/admin/toast"
import ConfirmationDialog from "@/components/admin/confirmation-dialog"
import { formatCurrency } from "@/libs/currencies"
import {
  type ResultLineItem,
  type ResultCategory,
  RESULT_CATEGORIES,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from "../results.types"
import { createResultItem, updateResultItem, deleteResultItem } from "../results.action"
import type { BudgetLineItem } from "../budget.types"

interface ResultsTabProps {
  eventDocumentId: string
  resultItems: ResultLineItem[]
  onResultItemsChange: (items: ResultLineItem[]) => void
  budgetItems: BudgetLineItem[]
  ticketRevenue: number
  currency: string
}

interface EditingItem {
  category: ResultCategory
  item: Partial<ResultLineItem>
}

export default function ResultsTab({
  eventDocumentId,
  resultItems,
  onResultItemsChange,
  budgetItems,
  ticketRevenue,
  currency,
}: ResultsTabProps) {
  const toast = useToast()
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: ResultLineItem | null }>({
    isOpen: false,
    item: null,
  })

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<ResultCategory, ResultLineItem[]> = {} as any
    for (const cat of [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]) {
      grouped[cat] = resultItems.filter((item) => item.category === cat)
    }
    return grouped
  }, [resultItems])

  // Group budget items by category for comparison
  const budgetByCategory = useMemo(() => {
    const grouped: Record<ResultCategory, number> = {} as any
    for (const cat of [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]) {
      grouped[cat] = budgetItems
        .filter((item) => item.category === cat)
        .reduce((sum, item) => sum + (item.total || 0), 0)
    }
    return grouped
  }, [budgetItems])

  // Calculate totals (including ticket revenue in income)
  const totals = useMemo(() => {
    let manualIncome = 0
    let totalExpenses = 0
    let budgetIncome = 0
    let budgetExpenses = 0

    for (const cat of INCOME_CATEGORIES) {
      manualIncome += itemsByCategory[cat].reduce((sum, item) => sum + (item.amount || 0), 0)
      budgetIncome += budgetByCategory[cat] || 0
    }

    // Total income = ticket revenue + manually entered income
    const totalIncome = ticketRevenue + manualIncome

    for (const cat of EXPENSE_CATEGORIES) {
      totalExpenses += itemsByCategory[cat].reduce((sum, item) => sum + (item.amount || 0), 0)
      budgetExpenses += budgetByCategory[cat] || 0
    }

    const result = totalIncome - totalExpenses
    const budgetResult = budgetIncome - budgetExpenses

    return {
      totalIncome,
      totalExpenses,
      result,
      budgetIncome,
      budgetExpenses,
      budgetResult,
      incomeVariance: totalIncome - budgetIncome,
      expenseVariance: totalExpenses - budgetExpenses,
      resultVariance: result - budgetResult,
    }
  }, [itemsByCategory, budgetByCategory, ticketRevenue])

  // Helper to format currency with event's currency
  const fmt = (amount: number) => formatCurrency(amount, currency)

  const formatVariance = (variance: number, isExpense: boolean = false) => {
    const isPositive = isExpense ? variance <= 0 : variance >= 0
    const prefix = variance >= 0 ? "+" : ""
    return (
      <span className={`variance ${isPositive ? "positive" : "negative"}`}>
        {prefix}
        {fmt(variance)}
      </span>
    )
  }

  const handleAddItem = (category: ResultCategory) => {
    setEditingItem({
      category,
      item: {
        category,
        name: "",
        description: "",
        amount: 0,
        sortOrder: itemsByCategory[category].length,
      },
    })
  }

  const handleEditItem = (item: ResultLineItem) => {
    setEditingItem({
      category: item.category,
      item: { ...item },
    })
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
  }

  const handleSaveItem = async () => {
    if (!editingItem) return

    const { item } = editingItem

    if (!item.name?.trim()) {
      toast.error("Name is required")
      return
    }

    setIsLoading(true)

    try {
      if (item.documentId) {
        // Update existing
        const result = await updateResultItem(item.documentId, {
          category: item.category,
          name: item.name,
          description: item.description,
          amount: item.amount,
          sortOrder: item.sortOrder,
        })

        if (result.success && result.data) {
          const updated = resultItems.map((i) =>
            i.documentId === item.documentId ? result.data! : i
          )
          onResultItemsChange(updated)
          toast.success("Item updated")
        } else {
          toast.error(result.error || "Failed to update result item")
        }
      } else {
        // Create new
        const result = await createResultItem(eventDocumentId, {
          category: item.category!,
          name: item.name!,
          description: item.description || null,
          amount: item.amount || 0,
          sortOrder: item.sortOrder || 0,
        })

        if (result.success && result.data) {
          onResultItemsChange([...resultItems, result.data])
          toast.success("Item created")
        } else {
          toast.error(result.error || "Failed to create result item")
        }
      }

      setEditingItem(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteItem = (item: ResultLineItem) => {
    if (!item.documentId) return
    setDeleteConfirm({ isOpen: true, item })
  }

  const confirmDelete = useCallback(async () => {
    const item = deleteConfirm.item
    if (!item?.documentId) return

    setDeleteConfirm({ isOpen: false, item: null })
    setIsLoading(true)

    try {
      const result = await deleteResultItem(item.documentId)

      if (result.success) {
        const updated = resultItems.filter((i) => i.documentId !== item.documentId)
        onResultItemsChange(updated)
        toast.success("Item deleted")
      } else {
        toast.error(result.error || "Failed to delete result item")
      }
    } finally {
      setIsLoading(false)
    }
  }, [deleteConfirm.item, resultItems, onResultItemsChange, toast])

  const cancelDelete = useCallback(() => {
    setDeleteConfirm({ isOpen: false, item: null })
  }, [])

  const updateEditingItem = (field: keyof ResultLineItem, value: any) => {
    if (!editingItem) return
    setEditingItem({
      ...editingItem,
      item: { ...editingItem.item, [field]: value },
    })
  }

  const renderEditForm = (currentEditingItem: EditingItem) => (
    <div className="actuals-item-edit">
      <div className="actuals-item-edit-fields">
        <div className="actuals-item-edit-row">
          <input
            type="text"
            className="admin-input"
            placeholder="Name"
            value={currentEditingItem.item.name || ""}
            onChange={(e) => updateEditingItem("name", e.target.value)}
          />
          <input
            type="text"
            className="admin-input"
            placeholder="Description (optional)"
            value={currentEditingItem.item.description || ""}
            onChange={(e) => updateEditingItem("description", e.target.value)}
          />
        </div>
        <div className="actuals-item-edit-row">
          <div className="input-with-prefix">
            <span className="input-prefix">{currency.toUpperCase()}</span>
            <input
              type="number"
              className="admin-input"
              placeholder="Amount"
              value={currentEditingItem.item.amount || ""}
              onChange={(e) => updateEditingItem("amount", parseFloat(e.target.value) || 0)}
              step="0.01"
            />
          </div>
          <div className="actuals-item-edit-actions">
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              onClick={handleSaveItem}
              disabled={isLoading}
            >
              {currentEditingItem.item.documentId ? "Save" : "Add"}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={handleCancelEdit}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCategorySection = (category: ResultCategory, isIncome: boolean) => {
    const items = itemsByCategory[category]
    const categoryInfo = RESULT_CATEGORIES[category]
    const manualTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0)
    // For tickets category, include ticket revenue in the total
    const categoryTotal = category === "tickets" ? ticketRevenue + manualTotal : manualTotal
    const categoryBudget = budgetByCategory[category] || 0
    const categoryVariance = categoryTotal - categoryBudget

    return (
      <div key={category} className="actuals-category-section">
        <div className="actuals-category-header">
          <div className="actuals-category-title">
            <i className={`bx ${categoryInfo.icon}`}></i>
            <span>{categoryInfo.label}</span>
          </div>
          <div className="actuals-category-values">
            <span className="actuals-category-budget" title="Budget">
              {fmt(categoryBudget)}
            </span>
            <span className="actuals-category-actual">{fmt(categoryTotal)}</span>
            {categoryBudget > 0 && formatVariance(categoryVariance, !isIncome)}
          </div>
        </div>

        <div className="actuals-items-list">
          {/* Ticket revenue - read-only calculated item for tickets category */}
          {category === "tickets" && ticketRevenue > 0 && (
            <div className="actuals-item actuals-item-calculated">
              <div className="actuals-item-view">
                <div className="actuals-item-info">
                  <span className="actuals-item-name">
                    <i className="bx bx-lock-alt"></i>
                    Ticket sales
                  </span>
                  <span className="actuals-item-description">Calculated from paid orders</span>
                </div>
                <div className="actuals-item-amount">{fmt(ticketRevenue)}</div>
              </div>
            </div>
          )}

          {items.map((item) => (
            <div key={item.documentId} className="actuals-item">
              {editingItem !== null && editingItem.item.documentId === item.documentId ? (
                renderEditForm(editingItem)
              ) : (
                <div className="actuals-item-view">
                  <div className="actuals-item-info">
                    <span className="actuals-item-name">{item.name}</span>
                    {item.description && (
                      <span className="actuals-item-description">{item.description}</span>
                    )}
                  </div>
                  <div className="actuals-item-amount">{fmt(item.amount)}</div>
                  <div className="actuals-item-actions">
                    <button
                      type="button"
                      className="admin-btn-icon"
                      onClick={() => handleEditItem(item)}
                      title="Edit"
                    >
                      <i className="bx bx-edit"></i>
                    </button>
                    <button
                      type="button"
                      className="admin-btn-icon admin-btn-icon-danger"
                      onClick={() => handleDeleteItem(item)}
                      title="Delete"
                    >
                      <i className="bx bx-trash"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* New item form */}
          {editingItem !== null && editingItem.category === category && !editingItem.item.documentId && (
            <div className="actuals-item actuals-item-new">
              {renderEditForm(editingItem)}
            </div>
          )}
        </div>

        {/* Add button */}
        {editingItem?.category !== category && (
          <button
            type="button"
            className="actuals-add-item-btn"
            onClick={() => handleAddItem(category)}
          >
            <i className="bx bx-plus"></i>
            Add {categoryInfo.label.toLowerCase()}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteConfirm.item?.name}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* Results Summary */}
      <div className="admin-form-section">
        <h2>Financial Results</h2>
        <p className="admin-form-section-description">
          Income and expenses after the event, compared to budget.
        </p>

        <div className="actuals-summary-table">
          <div className="actuals-summary-header">
            <span></span>
            <span>Budget</span>
            <span>Result</span>
            <span>Variance</span>
          </div>
          <div className="actuals-summary-row">
            <span>Total Income</span>
            <span>{fmt(totals.budgetIncome)}</span>
            <span className="actuals-value">{fmt(totals.totalIncome)}</span>
            {formatVariance(totals.incomeVariance)}
          </div>
          <div className="actuals-summary-row">
            <span>Total Expenses</span>
            <span>{fmt(totals.budgetExpenses)}</span>
            <span className="actuals-value">{fmt(totals.totalExpenses)}</span>
            {formatVariance(totals.expenseVariance, true)}
          </div>
          <div
            className={`actuals-summary-row actuals-summary-result ${totals.result >= 0 ? "profit" : "loss"}`}
          >
            <span>Result</span>
            <span>{fmt(totals.budgetResult)}</span>
            <span className="actuals-value">
              {totals.result >= 0 ? "+" : ""}
              {fmt(totals.result)}
            </span>
            {formatVariance(totals.resultVariance)}
          </div>
        </div>

        <div
          className={`actuals-result-card ${totals.result >= 0 ? "profit" : "loss"}`}
        >
          <div className="actuals-result-icon">
            <i className={`bx ${totals.result >= 0 ? "bx-trending-up" : "bx-trending-down"}`}></i>
          </div>
          <div className="actuals-result-info">
            <span className="actuals-result-label">
              {totals.result >= 0 ? "Profit" : "Loss"}
            </span>
            <span className="actuals-result-amount">{fmt(Math.abs(totals.result))}</span>
          </div>
        </div>
      </div>

      {/* Income Section */}
      <div className="admin-form-section">
        <h2>
          <i className="bx bx-trending-up"></i> Income
        </h2>
        <p className="admin-form-section-description">
          Record income received from tickets, sponsors, and other sources.
        </p>

        <div className="actuals-categories">
          {INCOME_CATEGORIES.map((cat) => renderCategorySection(cat, true))}
        </div>

        <div className="actuals-section-total">
          <span>Total Income</span>
          <span>{fmt(totals.totalIncome)}</span>
        </div>
      </div>

      {/* Expenses Section */}
      <div className="admin-form-section">
        <h2>
          <i className="bx bx-trending-down"></i> Expenses
        </h2>
        <p className="admin-form-section-description">
          Record expenses incurred during the event.
        </p>

        <div className="actuals-categories">
          {EXPENSE_CATEGORIES.map((cat) => renderCategorySection(cat, false))}
        </div>

        <div className="actuals-section-total">
          <span>Total Expenses</span>
          <span>{fmt(totals.totalExpenses)}</span>
        </div>
      </div>
    </>
  )
}
