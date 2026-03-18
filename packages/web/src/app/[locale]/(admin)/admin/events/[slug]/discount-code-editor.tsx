"use client"

import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import ConfirmationDialog from "@/components/admin/confirmation-dialog"
import {
  createDiscountCode,
  type DiscountCode,
  type DiscountCodeData,
  deleteDiscountCode,
  toggleDiscountCodeActive,
  updateDiscountCode,
} from "./discount-code.action"

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
  const t = useTranslations("adminEvents")
  // Local state for optimistic updates
  const [localCodes, setLocalCodes] = useState<DiscountCode[]>(discountCodes)
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

  // Sync local state with props when they change
  useEffect(() => {
    setLocalCodes(discountCodes)
  }, [discountCodes])

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

    // Store previous state for rollback on error
    const previousLocalCodes = localCodes

    if (editingId) {
      // Optimistic update for editing: update the code in the list immediately
      const optimisticCode: DiscountCode = {
        documentId: editingId,
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses,
        usedCount: formData.usedCount || 0,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        minOrderAmount: data.minOrderAmount,
        maxDiscountAmount: data.maxDiscountAmount,
        isActive: data.isActive ?? true,
        description: data.description,
        createdAt:
          localCodes.find((c) => c.documentId === editingId)?.createdAt || new Date().toISOString(),
      }
      setLocalCodes((prev) => prev.map((c) => (c.documentId === editingId ? optimisticCode : c)))

      // Close form immediately for better UX
      setEditingId(null)
      setIsLoading(false)

      const result = await updateDiscountCode(editingId, data)

      if (result.success && result.data) {
        // Update with server data (in case there are any differences)
        setLocalCodes((prev) => prev.map((c) => (c.documentId === editingId ? result.data! : c)))
        onUpdate()
      } else {
        // Rollback on error
        setLocalCodes(previousLocalCodes)
        setError(result.error || "Failed to save discount code")
      }
    } else {
      // Optimistic update for creating: add a temporary code to the list
      const tempId = `temp-${Date.now()}`
      const optimisticCode: DiscountCode = {
        documentId: tempId,
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses,
        usedCount: 0,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        minOrderAmount: data.minOrderAmount,
        maxDiscountAmount: data.maxDiscountAmount,
        isActive: data.isActive ?? true,
        description: data.description,
        createdAt: new Date().toISOString(),
      }
      setLocalCodes((prev) => [...prev, optimisticCode])

      // Close form immediately for better UX
      setIsAdding(false)
      setIsLoading(false)

      const result = await createDiscountCode(eventId, data)

      if (result.success && result.data) {
        // Replace temporary code with real data from server
        setLocalCodes((prev) => prev.map((c) => (c.documentId === tempId ? result.data! : c)))
        onUpdate()
      } else {
        // Rollback on error: remove the temporary code
        setLocalCodes(previousLocalCodes)
        setError(result.error || "Failed to save discount code")
      }
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

    setError(null)

    // Store previous state for rollback on error
    const previousLocalCodes = localCodes

    // Optimistic delete: remove the code immediately
    setLocalCodes((prev) => prev.filter((c) => c.documentId !== codeId))

    const result = await deleteDiscountCode(codeId)

    if (result.success) {
      onUpdate()
    } else {
      // Rollback on error: restore the code
      setLocalCodes(previousLocalCodes)
      setError(result.error || "Failed to delete discount code")
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ isOpen: false, codeId: null, codeName: "" })
  }

  const handleToggleActive = async (code: DiscountCode) => {
    setError(null)

    // Store previous state for rollback on error
    const previousLocalCodes = localCodes
    const newIsActive = !code.isActive

    // Optimistic update: toggle the active status immediately
    setLocalCodes((prev) =>
      prev.map((c) => (c.documentId === code.documentId ? { ...c, isActive: newIsActive } : c))
    )

    const result = await toggleDiscountCodeActive(code.documentId, newIsActive)

    if (result.success && result.data) {
      // Update with server data (in case there are any differences)
      setLocalCodes((prev) =>
        prev.map((c) => (c.documentId === code.documentId ? result.data! : c))
      )
      onUpdate()
    } else {
      // Rollback on error
      setLocalCodes(previousLocalCodes)
      setError(result.error || "Failed to update discount code")
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
          <i className="bx bx-error-circle" />
          {error}
        </div>
      )}

      {/* Existing discount codes */}
      <div className="discount-code-list">
        {localCodes.map((code) => (
          <div
            key={code.documentId}
            className={`discount-code-card ${!code.isActive ? "discount-inactive" : ""}`}
          >
            {editingId === code.documentId ? (
              // Editing mode
              <div className="discount-code-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>{t("discountCodes.code")}</label>
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
                    <label>{t("discountCodes.description")}</label>
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
                    <label>{t("discountCodes.discountType")}</label>
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
                      <option value="percentage">{t("discountCodes.percentage")}</option>
                      <option value="fixed">{t("discountCodes.fixedAmount")}</option>
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>
                      {t("discountCodes.discountValue")}{" "}
                      {formData.discountType === "percentage" ? "(%)" : "(amount)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={formData.discountType === "percentage" ? 100 : undefined}
                      step={formData.discountType === "percentage" ? 1 : 0.01}
                      value={formData.discountValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountValue: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      className="admin-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>{t("discountCodes.maxUses")}</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxUses ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxUses: e.target.value ? Number.parseInt(e.target.value, 10) : null,
                        })
                      }
                      className="admin-input"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>{t("discountCodes.validFrom")}</label>
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
                    <label>{t("discountCodes.validUntil")}</label>
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
                    <label>{t("discountCodes.minOrderAmount")}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.minOrderAmount ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minOrderAmount: e.target.value ? Number.parseFloat(e.target.value) : null,
                        })
                      }
                      className="admin-input"
                      placeholder="No minimum"
                    />
                  </div>
                  {formData.discountType === "percentage" && (
                    <div className="admin-form-group">
                      <label>{t("discountCodes.maxDiscountAmount")}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.maxDiscountAmount ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maxDiscountAmount: e.target.value
                              ? Number.parseFloat(e.target.value)
                              : null,
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
                    <span>{t("discountCodes.active")}</span>
                  </label>
                </div>

                <div className="discount-code-actions">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isLoading}
                    className="admin-btn admin-btn-primary admin-btn-sm"
                  >
                    {isLoading ? t("discountCodes.saving") : t("discountCodes.save")}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={isLoading}
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                  >
                    {t("discountCodes.cancel")}
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
                    <i className="bx bx-edit" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(code)}
                    className="admin-btn admin-btn-icon"
                    title={code.isActive ? "Deactivate" : "Activate"}
                  >
                    <i className={`bx ${code.isActive ? "bx-hide" : "bx-show"}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(code)}
                    disabled={code.usedCount > 0}
                    className="admin-btn admin-btn-icon admin-btn-danger"
                    title={code.usedCount > 0 ? "Cannot delete: code has been used" : "Delete"}
                  >
                    <i className="bx bx-trash" />
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
                    setFormData({
                      ...formData,
                      discountValue: Number.parseFloat(e.target.value) || 0,
                    })
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
                      maxUses: e.target.value ? Number.parseInt(e.target.value, 10) : null,
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
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value || null })}
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label>Valid Until</label>
                <input
                  type="datetime-local"
                  value={formData.validUntil || ""}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value || null })}
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
                      minOrderAmount: e.target.value ? Number.parseFloat(e.target.value) : null,
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
                        maxDiscountAmount: e.target.value
                          ? Number.parseFloat(e.target.value)
                          : null,
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
          <i className="bx bx-plus" />
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
