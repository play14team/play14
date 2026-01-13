"use client"

import { useState } from "react"
import {
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  toggleDiscountCodeActive,
  type DiscountCode,
  type DiscountCodeData,
} from "./discount-code.action"
import ConfirmationDialog from "@/components/admin/confirmation-dialog"

interface Props {
  eventId: string
  discountCodes: DiscountCode[]
  onUpdate: () => void
}

interface EditingCode extends DiscountCodeData {
  documentId?: string
  usedCount?: number
}

export default function DiscountCodeEditor({ eventId, discountCodes, onUpdate }: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    codeId: string | null
    codeName: string
  }>({ isOpen: false, codeId: null, codeName: "" })

  const [formData, setFormData] = useState<EditingCode>({
    code: "",
    discountType: "percentage",
    discountValue: 10,
    maxUses: null,
    validFrom: null,
    validUntil: null,
    minOrderAmount: null,
    maxDiscountAmount: null,
    isActive: true,
    description: "",
  })

  const resetForm = () => {
    setFormData({
      code: "",
      discountType: "percentage",
      discountValue: 10,
      maxUses: null,
      validFrom: null,
      validUntil: null,
      minOrderAmount: null,
      maxDiscountAmount: null,
      isActive: true,
      description: "",
    })
    setIsAdding(false)
    setEditingId(null)
    setError(null)
  }

  const startEditing = (code: DiscountCode) => {
    setFormData({
      documentId: code.documentId,
      code: code.code,
      discountType: code.discountType,
      discountValue: code.discountValue,
      maxUses: code.maxUses,
      validFrom: code.validFrom ? code.validFrom.substring(0, 16) : null,
      validUntil: code.validUntil ? code.validUntil.substring(0, 16) : null,
      minOrderAmount: code.minOrderAmount,
      maxDiscountAmount: code.maxDiscountAmount,
      isActive: code.isActive,
      description: code.description || "",
      usedCount: code.usedCount,
    })
    setEditingId(code.documentId)
    setIsAdding(false)
    setError(null)
  }

  const startAdding = () => {
    resetForm()
    setIsAdding(true)
  }

  const handleSave = async () => {
    if (!formData.code.trim()) {
      setError("Code is required")
      return
    }

    if (formData.discountValue <= 0) {
      setError("Discount value must be greater than 0")
      return
    }

    if (formData.discountType === "percentage" && formData.discountValue > 100) {
      setError("Percentage discount cannot exceed 100%")
      return
    }

    setIsLoading(true)
    setError(null)

    const data: DiscountCodeData = {
      code: formData.code.trim().toUpperCase(),
      discountType: formData.discountType,
      discountValue: formData.discountValue,
      maxUses: formData.maxUses,
      validFrom: formData.validFrom || null,
      validUntil: formData.validUntil || null,
      minOrderAmount: formData.minOrderAmount,
      maxDiscountAmount: formData.maxDiscountAmount,
      isActive: formData.isActive,
      description: formData.description?.trim() || undefined,
    }

    let result
    if (editingId) {
      result = await updateDiscountCode(editingId, data)
    } else {
      result = await createDiscountCode(eventId, data)
    }

    if (result.success) {
      // Close form and reset loading state
      // The form/edit UI is now hidden, so user won't see the state change
      setIsAdding(false)
      setEditingId(null)
      setIsLoading(false)
      onUpdate()
    } else {
      setError(result.error || "Failed to save discount code")
      setIsLoading(false)
    }
  }

  const handleDeleteClick = (code: DiscountCode) => {
    setDeleteConfirmation({
      isOpen: true,
      codeId: code.documentId,
      codeName: code.code,
    })
  }

  const handleDeleteConfirm = async () => {
    const codeId = deleteConfirmation.codeId
    setDeleteConfirmation({ isOpen: false, codeId: null, codeName: "" })

    if (!codeId) return

    setIsLoading(true)
    setError(null)

    const result = await deleteDiscountCode(codeId)

    if (result.success) {
      // Reset loading state before refresh so it doesn't block subsequent operations
      setIsLoading(false)
      onUpdate()
    } else {
      setError(result.error || "Failed to delete discount code")
      setIsLoading(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ isOpen: false, codeId: null, codeName: "" })
  }

  const handleToggleActive = async (code: DiscountCode) => {
    setIsLoading(true)
    const result = await toggleDiscountCodeActive(code.documentId, !code.isActive)

    if (result.success) {
      // Reset loading state before refresh so it doesn't block subsequent operations
      setIsLoading(false)
      onUpdate()
    } else {
      setError(result.error || "Failed to update discount code")
      setIsLoading(false)
    }
  }

  const formatDiscount = (code: DiscountCode) => {
    if (code.discountType === "percentage") {
      return `${code.discountValue}%`
    }
    return `${code.discountValue.toFixed(2)} (fixed)`
  }

  return (
    <div className="discount-code-editor">
      {error && (
        <div className="admin-alert admin-alert-error">
          <i className="bx bx-error-circle"></i>
          {error}
        </div>
      )}

      {/* Existing discount codes */}
      <div className="discount-code-list">
        {discountCodes.map((code) => (
          <div
            key={code.documentId}
            className={`discount-code-card ${!code.isActive ? "discount-inactive" : ""}`}
          >
            {editingId === code.documentId ? (
              // Editing mode
              <div className="discount-code-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Code *</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="admin-input"
                      placeholder="e.g., EARLY20"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="admin-input"
                      placeholder="Optional description"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Discount Type *</label>
                    <select
                      value={formData.discountType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountType: e.target.value as "percentage" | "fixed",
                        })
                      }
                      className="admin-select"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>
                      Discount Value * {formData.discountType === "percentage" ? "(%)" : "(amount)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={formData.discountType === "percentage" ? 100 : undefined}
                      step={formData.discountType === "percentage" ? 1 : 0.01}
                      value={formData.discountValue}
                      onChange={(e) =>
                        setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })
                      }
                      className="admin-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Max Uses</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxUses ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxUses: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      className="admin-input"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Valid From</label>
                    <input
                      type="datetime-local"
                      value={formData.validFrom || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, validFrom: e.target.value || null })
                      }
                      className="admin-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Valid Until</label>
                    <input
                      type="datetime-local"
                      value={formData.validUntil || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, validUntil: e.target.value || null })
                      }
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Min Order Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.minOrderAmount ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minOrderAmount: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      className="admin-input"
                      placeholder="No minimum"
                    />
                  </div>
                  {formData.discountType === "percentage" && (
                    <div className="admin-form-group">
                      <label>Max Discount Amount</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.maxDiscountAmount ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        className="admin-input"
                        placeholder="No cap"
                      />
                    </div>
                  )}
                </div>

                <div className="admin-form-row">
                  <label className="admin-checkbox-option">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span>Active (can be used)</span>
                  </label>
                </div>

                <div className="discount-code-actions">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isLoading}
                    className="admin-btn admin-btn-primary admin-btn-sm"
                  >
                    {isLoading ? "Saving..." : "Save"}
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
              <>
                <div className="discount-code-info">
                  <div className="discount-code-header">
                    <h4 className="discount-code-name">{code.code}</h4>
                    {!code.isActive && <span className="discount-badge inactive">Inactive</span>}
                    {code.usedCount > 0 && (
                      <span className="discount-badge used">
                        {code.usedCount} used
                        {code.maxUses && ` / ${code.maxUses}`}
                      </span>
                    )}
                  </div>
                  {code.description && (
                    <p className="discount-code-description">{code.description}</p>
                  )}
                  <div className="discount-code-details">
                    <span className="discount-value">{formatDiscount(code)} off</span>
                    {code.minOrderAmount && code.minOrderAmount > 0 && (
                      <span className="discount-min">Min: {code.minOrderAmount.toFixed(2)}</span>
                    )}
                    {code.maxDiscountAmount && code.maxDiscountAmount > 0 && (
                      <span className="discount-max">
                        Max discount: {code.maxDiscountAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="discount-code-actions">
                  <button
                    type="button"
                    onClick={() => startEditing(code)}
                    className="admin-btn admin-btn-icon"
                    title="Edit"
                  >
                    <i className="bx bx-edit"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(code)}
                    className="admin-btn admin-btn-icon"
                    title={code.isActive ? "Deactivate" : "Activate"}
                  >
                    <i className={`bx ${code.isActive ? "bx-hide" : "bx-show"}`}></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(code)}
                    disabled={code.usedCount > 0}
                    className="admin-btn admin-btn-icon admin-btn-danger"
                    title={code.usedCount > 0 ? "Cannot delete: code has been used" : "Delete"}
                  >
                    <i className="bx bx-trash"></i>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new discount code form */}
      {isAdding && (
        <div className="discount-code-card discount-code-new">
          <div className="discount-code-form">
            <h4>New Discount Code</h4>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="admin-input"
                  placeholder="e.g., EARLY20"
                />
              </div>
              <div className="admin-form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="admin-input"
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Discount Type *</label>
                <select
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountType: e.target.value as "percentage" | "fixed",
                    })
                  }
                  className="admin-select"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label>
                  Discount Value * {formData.discountType === "percentage" ? "(%)" : "(amount)"}
                </label>
                <input
                  type="number"
                  min="0"
                  max={formData.discountType === "percentage" ? 100 : undefined}
                  step={formData.discountType === "percentage" ? 1 : 0.01}
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })
                  }
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label>Max Uses</label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxUses ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxUses: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="admin-input"
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Valid From</label>
                <input
                  type="datetime-local"
                  value={formData.validFrom || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, validFrom: e.target.value || null })
                  }
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label>Valid Until</label>
                <input
                  type="datetime-local"
                  value={formData.validUntil || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, validUntil: e.target.value || null })
                  }
                  className="admin-input"
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Min Order Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minOrderAmount ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minOrderAmount: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="admin-input"
                  placeholder="No minimum"
                />
              </div>
              {formData.discountType === "percentage" && (
                <div className="admin-form-group">
                  <label>Max Discount Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.maxDiscountAmount ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="admin-input"
                    placeholder="No cap"
                  />
                </div>
              )}
            </div>

            <div className="admin-form-row">
              <label className="admin-checkbox-option">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span>Active (can be used)</span>
              </label>
            </div>

            <div className="discount-code-actions">
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading}
                className="admin-btn admin-btn-primary admin-btn-sm"
              >
                {isLoading ? "Creating..." : "Create Discount Code"}
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
        </div>
      )}

      {/* Add button */}
      {!isAdding && !editingId && (
        <button type="button" onClick={startAdding} className="admin-btn admin-btn-secondary">
          <i className="bx bx-plus"></i>
          Add Discount Code
        </button>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        title="Delete Discount Code"
        message={`Are you sure you want to delete the discount code "${deleteConfirmation.codeName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}
