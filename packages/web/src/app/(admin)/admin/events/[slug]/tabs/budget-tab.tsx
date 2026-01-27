"use client"

import { useCallback, useMemo, useState } from "react"
import ConfirmationDialog from "@/components/admin/confirmation-dialog"
import { useToast } from "@/components/admin/toast"
import { formatCurrency } from "@/libs/currencies"
import { createBudgetItem, deleteBudgetItem, updateBudgetItem } from "../budget.action"
import {
  BUDGET_CATEGORIES,
  type BudgetCategory,
  type BudgetLineItem,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "../budget.types"

interface BudgetTabProps {
  eventDocumentId: string
  budgetItems: BudgetLineItem[]
  onBudgetItemsChange: (items: BudgetLineItem[]) => void
  currency: string
}

interface EditingItem {
  category: BudgetCategory
  item: Partial<BudgetLineItem>
}

export default function BudgetTab({
  eventDocumentId,
  budgetItems,
  onBudgetItemsChange,
  currency,
}: BudgetTabProps) {
  const toast = useToast()
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [targetMargin, setTargetMargin] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    item: BudgetLineItem | null
  }>({
    isOpen: false,
    item: null,
  })

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<BudgetCategory, BudgetLineItem[]> = {} as any
    for (const cat of [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]) {
      grouped[cat] = budgetItems.filter((item) => item.category === cat)
    }
    return grouped
  }, [budgetItems])

  // Calculate totals
  const totals = useMemo(() => {
    let totalIncome = 0
    let totalExpenses = 0

    for (const cat of INCOME_CATEGORIES) {
      totalIncome += itemsByCategory[cat].reduce((sum, item) => sum + (item.total || 0), 0)
    }

    for (const cat of EXPENSE_CATEGORIES) {
      totalExpenses += itemsByCategory[cat].reduce((sum, item) => sum + (item.total || 0), 0)
    }

    const margin = totalIncome - totalExpenses
    const breakEvenIncome = totalExpenses + targetMargin

    return {
      totalIncome,
      totalExpenses,
      margin,
      breakEvenIncome,
    }
  }, [itemsByCategory, targetMargin])

  // Helper to format currency with event's currency
  const fmt = (amount: number) => formatCurrency(amount, currency)

  const handleAddItem = (category: BudgetCategory) => {
    setEditingItem({
      category,
      item: {
        category,
        name: "",
        description: "",
        unitPrice: 0,
        quantity: 1,
        total: 0,
        sortOrder: itemsByCategory[category].length,
      },
    })
  }

  const handleEditItem = (item: BudgetLineItem) => {
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
        const result = await updateBudgetItem(item.documentId, {
          category: item.category,
          name: item.name,
          description: item.description,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          total: (item.unitPrice || 0) * (item.quantity || 1),
          sortOrder: item.sortOrder,
        })

        if (result.success && result.data) {
          const updated = budgetItems.map((i) =>
            i.documentId === item.documentId ? result.data! : i
          )
          onBudgetItemsChange(updated)
          toast.success("Budget item updated")
        } else {
          toast.error(result.error || "Failed to update budget item")
        }
      } else {
        // Create new
        const result = await createBudgetItem(eventDocumentId, {
          category: item.category!,
          name: item.name!,
          description: item.description || null,
          unitPrice: item.unitPrice || 0,
          quantity: item.quantity || 1,
          total: (item.unitPrice || 0) * (item.quantity || 1),
          sortOrder: item.sortOrder || 0,
        })

        if (result.success && result.data) {
          onBudgetItemsChange([...budgetItems, result.data])
          toast.success("Budget item created")
        } else {
          toast.error(result.error || "Failed to create budget item")
        }
      }

      setEditingItem(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteItem = (item: BudgetLineItem) => {
    if (!item.documentId) return
    setDeleteConfirm({ isOpen: true, item })
  }

  const confirmDelete = useCallback(async () => {
    const item = deleteConfirm.item
    if (!item?.documentId) return

    setDeleteConfirm({ isOpen: false, item: null })
    setIsLoading(true)

    try {
      const result = await deleteBudgetItem(item.documentId)

      if (result.success) {
        const updated = budgetItems.filter((i) => i.documentId !== item.documentId)
        onBudgetItemsChange(updated)
        toast.success("Budget item deleted")
      } else {
        toast.error(result.error || "Failed to delete budget item")
      }
    } finally {
      setIsLoading(false)
    }
  }, [deleteConfirm.item, budgetItems, onBudgetItemsChange, toast])

  const cancelDelete = useCallback(() => {
    setDeleteConfirm({ isOpen: false, item: null })
  }, [])

  const updateEditingItem = (field: keyof BudgetLineItem, value: any) => {
    if (!editingItem) return

    const newItem = { ...editingItem.item, [field]: value }

    // Auto-calculate total when price or quantity changes
    if (field === "unitPrice" || field === "quantity") {
      newItem.total = (newItem.unitPrice || 0) * (newItem.quantity || 1)
    }

    setEditingItem({ ...editingItem, item: newItem })
  }

  const renderEditForm = (currentEditingItem: EditingItem) => (
    <div className="budget-item-edit">
      <div className="budget-item-edit-fields">
        <input
          type="text"
          className="admin-input"
          placeholder="Name"
          value={currentEditingItem.item.name || ""}
          onChange={(e) => updateEditingItem("name", e.target.value)}
        />
        <div className="budget-item-edit-numbers">
          <div className="input-with-prefix">
            <span className="input-prefix">EUR</span>
            <input
              type="number"
              className="admin-input"
              placeholder="Unit price"
              value={currentEditingItem.item.unitPrice || ""}
              onChange={(e) =>
                updateEditingItem("unitPrice", Number.parseFloat(e.target.value) || 0)
              }
              step="0.01"
            />
          </div>
          <span className="budget-item-multiply">×</span>
          <input
            type="number"
            className="admin-input budget-item-quantity"
            placeholder="Qty"
            value={currentEditingItem.item.quantity || ""}
            onChange={(e) =>
              updateEditingItem("quantity", Number.parseInt(e.target.value, 10) || 1)
            }
            min="1"
          />
          <span className="budget-item-equals">=</span>
          <span className="budget-item-total">{fmt(currentEditingItem.item.total || 0)}</span>
        </div>
        <input
          type="text"
          className="admin-input"
          placeholder="Description (optional)"
          value={currentEditingItem.item.description || ""}
          onChange={(e) => updateEditingItem("description", e.target.value)}
        />
      </div>
      <div className="budget-item-edit-actions">
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
  )

  const renderCategorySection = (category: BudgetCategory, _isIncome: boolean) => {
    const items = itemsByCategory[category]
    const categoryInfo = BUDGET_CATEGORIES[category]
    const categoryTotal = items.reduce((sum, item) => sum + (item.total || 0), 0)

    return (
      <div key={category} className="budget-category-section">
        <div className="budget-category-header">
          <div className="budget-category-title">
            <i className={`bx ${categoryInfo.icon}`} />
            <span>{categoryInfo.label}</span>
          </div>
          <div className="budget-category-total">{fmt(categoryTotal)}</div>
        </div>

        <div className="budget-items-list">
          {items.map((item) => (
            <div key={item.documentId} className="budget-item">
              {editingItem !== null && editingItem.item.documentId === item.documentId ? (
                renderEditForm(editingItem)
              ) : (
                <div className="budget-item-view">
                  <div className="budget-item-info">
                    <span className="budget-item-name">{item.name}</span>
                    {item.description && (
                      <span className="budget-item-description">{item.description}</span>
                    )}
                  </div>
                  <div className="budget-item-values">
                    <span className="budget-item-calculation">
                      {fmt(item.unitPrice)} × {item.quantity}
                    </span>
                    <span className="budget-item-total">{fmt(item.total)}</span>
                  </div>
                  <div className="budget-item-actions">
                    <button
                      type="button"
                      className="admin-btn-icon"
                      onClick={() => handleEditItem(item)}
                      title="Edit"
                    >
                      <i className="bx bx-edit" />
                    </button>
                    <button
                      type="button"
                      className="admin-btn-icon admin-btn-icon-danger"
                      onClick={() => handleDeleteItem(item)}
                      title="Delete"
                    >
                      <i className="bx bx-trash" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* New item form */}
          {editingItem !== null &&
            editingItem.category === category &&
            !editingItem.item.documentId && (
              <div className="budget-item budget-item-new">{renderEditForm(editingItem)}</div>
            )}
        </div>

        {/* Add button */}
        {editingItem?.category !== category && (
          <button
            type="button"
            className="budget-add-item-btn"
            onClick={() => handleAddItem(category)}
          >
            <i className="bx bx-plus" />
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

      {/* Budget Summary */}
      <div className="admin-form-section">
        <h2>Budget Summary</h2>
        <p className="admin-form-section-description">
          Plan your event budget with projected income and expenses.
        </p>

        <div className="budget-summary-cards">
          <div className="budget-summary-card budget-summary-income">
            <div className="budget-summary-label">Total Income</div>
            <div className="budget-summary-value">{fmt(totals.totalIncome)}</div>
          </div>
          <div className="budget-summary-card budget-summary-expenses">
            <div className="budget-summary-label">Total Expenses</div>
            <div className="budget-summary-value">{fmt(totals.totalExpenses)}</div>
          </div>
          <div
            className={`budget-summary-card budget-summary-margin ${totals.margin >= 0 ? "positive" : "negative"}`}
          >
            <div className="budget-summary-label">Projected Margin</div>
            <div className="budget-summary-value">
              {totals.margin >= 0 ? "+" : ""}
              {fmt(totals.margin)}
            </div>
          </div>
        </div>
      </div>

      {/* Break-even Calculator */}
      <div className="admin-form-section">
        <h2>Break-even Calculator</h2>
        <p className="admin-form-section-description">
          Calculate how much income is needed to cover expenses and reach your target margin.
        </p>

        <div className="break-even-calculator">
          <div className="break-even-input">
            <label>Target Margin</label>
            <div className="input-with-prefix">
              <span className="input-prefix">EUR</span>
              <input
                type="number"
                className="admin-input"
                value={targetMargin}
                onChange={(e) => setTargetMargin(Number.parseFloat(e.target.value) || 0)}
                step="100"
              />
            </div>
          </div>
          <div className="break-even-result">
            <div className="break-even-formula">
              <span>Expenses ({fmt(totals.totalExpenses)})</span>
              <span>+</span>
              <span>Target Margin ({fmt(targetMargin)})</span>
              <span>=</span>
              <span className="break-even-total">
                Required Income: {fmt(totals.breakEvenIncome)}
              </span>
            </div>
            {totals.totalIncome > 0 && (
              <div
                className={`break-even-status ${totals.totalIncome >= totals.breakEvenIncome ? "on-track" : "below-target"}`}
              >
                {totals.totalIncome >= totals.breakEvenIncome ? (
                  <>
                    <i className="bx bx-check-circle" />
                    <span>
                      On track! {fmt(totals.totalIncome - totals.breakEvenIncome)} above target.
                    </span>
                  </>
                ) : (
                  <>
                    <i className="bx bx-error-circle" />
                    <span>
                      Need {fmt(totals.breakEvenIncome - totals.totalIncome)} more income to reach
                      target.
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Income Section */}
      <div className="admin-form-section">
        <h2>
          <i className="bx bx-trending-up" /> Projected Income
        </h2>
        <p className="admin-form-section-description">
          Estimate your income from tickets, sponsors, and other sources.
        </p>

        <div className="budget-categories">
          {INCOME_CATEGORIES.map((cat) => renderCategorySection(cat, true))}
        </div>

        <div className="budget-section-total">
          <span>Total Projected Income</span>
          <span>{fmt(totals.totalIncome)}</span>
        </div>
      </div>

      {/* Expenses Section */}
      <div className="admin-form-section">
        <h2>
          <i className="bx bx-trending-down" /> Projected Expenses
        </h2>
        <p className="admin-form-section-description">Plan your expenses by category.</p>

        <div className="budget-categories">
          {EXPENSE_CATEGORIES.map((cat) => renderCategorySection(cat, false))}
        </div>

        <div className="budget-section-total">
          <span>Total Projected Expenses</span>
          <span>{fmt(totals.totalExpenses)}</span>
        </div>
      </div>
    </>
  )
}
